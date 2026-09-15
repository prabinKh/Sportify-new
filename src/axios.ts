import Axios from 'axios';
import { getRefreshToken } from './utils/spotify/login';
import { getFromLocalStorageWithExpiry } from './utils/localstorage';
import { cacheGet, cacheSet } from './utils/cache';

const resolveApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string)?.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return /^https?:\/\//i.test(envUrl) ? envUrl : `http://${envUrl}`;
  }

  // If running in a browser, dynamically match the host and port
  if (typeof window !== 'undefined' && window.location.hostname) {
    const browserHost = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    // Production VPS host port 3004 -> maps to backend API port 8004
    if (port === '3004') {
      return `${protocol}//${browserHost}:8004`;
    }

    // Support port 3001 -> 8001
    if (port === '3001') {
      return `${protocol}//${browserHost}:8001`;
    }

    // Local dev on port 3000 or 5173 -> maps to backend port 8000
    if (port === '3000' || port === '5173') {
      return `${protocol}//${browserHost}:8000`;
    }

    const isLocalOrLan =
      browserHost === 'localhost' ||
      browserHost === '127.0.0.1' ||
      /^192\.168\./.test(browserHost) ||
      /^10\./.test(browserHost) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(browserHost);

    if (isLocalOrLan) {
      return `${protocol}//${browserHost}:8000`;
    }

    // Default for VPS IP or custom domain
    return `${protocol}//${browserHost}:8004`;
  }

  if (envUrl) {
    return /^https?:\/\//i.test(envUrl) ? envUrl : `http://${envUrl}`;
  }

  const localIp = (import.meta.env.VITE_LOCAL_IP as string)?.trim();
  if (localIp) {
    return /^https?:\/\//i.test(localIp) ? localIp : `http://${localIp}:8000`;
  }

  return 'http://localhost:8000';
};

export const API_BASE_URL = resolveApiBaseUrl().replace(/\/+$/, '');

const path = API_BASE_URL;

const access_token = getFromLocalStorageWithExpiry('access_token') as string;

const axios = Axios.create({
  baseURL: path,
  headers: {},
});

if (access_token) {
  axios.defaults.headers.common['Authorization'] =
    access_token.startsWith('Token ') || access_token.startsWith('Bearer ')
      ? access_token
      : `Token ${access_token}`;
}

// --- Global concurrency limiter --------------------------------------------------------------
// Several screens (Home, Artist) fan out many requests at once, and dev StrictMode doubles
// them. Spotify's tightened Feb-2026 rate limits 429 on those bursts. Cap how many requests are
// in flight at once so traffic is smoothed instead of bursted; the rest queue and drain as
// slots free up. Combined with the 429 backoff below, this keeps the app under the limit.
const MAX_CONCURRENT = 3;
let activeRequests = 0;
const waiters: Array<() => void> = [];

const acquireSlot = () =>
  new Promise<void>((resolve) => {
    if (activeRequests < MAX_CONCURRENT) {
      activeRequests++;
      resolve();
    } else {
      waiters.push(() => {
        activeRequests++;
        resolve();
      });
    }
  });

const releaseSlot = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  waiters.shift()?.();
};

// --- IndexedDB response cache ----------------------------------------------------------------
// Catalog data (artists/albums/tracks) is immutable, so cache GETs of it in IndexedDB and serve
// from there on repeat views and across reloads. This is the real fix for the rate limiting:
// navigating back to a page, or hard-refreshing, no longer re-hits the network. Only static
// catalog GETs are cached — user state (/me/*), search, and all mutations always hit the API.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // catalog is static; 24h is safe
const CACHEABLE_PATH = /^\/(artists|albums|tracks)(\/|$)/;

const isCacheableGet = (config: any) =>
  (config.method || 'get').toLowerCase() === 'get' && CACHEABLE_PATH.test(config.url || '');

const cacheKeyFor = (config: any) =>
  `${config.url}?${JSON.stringify(config.params || {})}`;

axios.interceptors.request.use(async (config) => {
  const currentToken = localStorage.getItem('access_token');
  if (currentToken && !config.headers['Authorization']) {
    config.headers['Authorization'] =
      currentToken.startsWith('Token ') || currentToken.startsWith('Bearer ')
        ? currentToken
        : `Token ${currentToken}`;
  }

  await acquireSlot();

  if (isCacheableGet(config)) {
    const key = cacheKeyFor(config);
    const entry = await cacheGet(key);
    if (entry && entry.expiry > Date.now()) {
      // Cache hit — short-circuit the network by serving from a one-off adapter. The response
      // still flows through the response interceptor below (so the slot is released normally).
      (config as any).adapter = async () => ({
        data: entry.data,
        status: 200,
        statusText: 'OK (cache)',
        headers: {},
        config,
        request: {},
      });
    } else {
      // Mark for storing once the network response comes back.
      (config as any).__cacheKey = key;
    }
  }

  return config;
});

axios.interceptors.response.use(
  (response) => {
    releaseSlot();

    const key = (response.config as any).__cacheKey;
    if (key && response.status === 200) {
      void cacheSet(key, { data: response.data, expiry: Date.now() + CACHE_TTL_MS });
    }
    return response;
  },
  async (error) => {
    // Release this attempt's slot first so a retry (and other queued requests) can proceed.
    releaseSlot();

    const response = error?.response;
    const config = error?.config;

    // Network error / no response — nothing to recover from.
    if (!response || !config) return Promise.reject(error);

    if (response.status === 401) {
      return getRefreshToken()
        .then((token) => {
          if (!token) return Promise.reject(error);
          axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
          config.headers['Authorization'] = 'Bearer ' + token;
          return axios(config);
        })
        .catch(() => {
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('access_token');
        });
    }

    // 429 Too Many Requests: Spotify's tightened (Feb 2026) rate limits are easy to trip when
    // a page fires a burst of calls (and dev StrictMode doubles them). Back off for the
    // server-specified `Retry-After`, then retry — bounded so we never loop forever.
    if (response.status === 429) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      // Only one retry: during a global cooldown, re-issuing many times just adds load and
      // prolongs the penalty window.
      if (config.__retryCount > 1) return Promise.reject(error);
      const retryAfter = Number(response.headers?.['retry-after']);
      const waitMs = Math.min((Number.isFinite(retryAfter) ? retryAfter : 1) * 1000, 10000);
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 500)));
      return axios(config);
    }

    return Promise.reject(error);
  }
);

export default axios;
