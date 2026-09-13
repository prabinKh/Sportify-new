import axios from '../axios';
import { store } from '../store/store';
import { spotifyActions } from '../store/slices/spotify';
import { formatLocalTrack, normalizeMediaUrl } from '../utils';

const audioElement = new Audio();
let currentQueue: any[] = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode: 'off' | 'track' | 'context' = 'off';

const notifyState = () => {
  const currentTrack = currentQueue[currentIndex];
  if (!currentTrack) {
    store.dispatch(spotifyActions.setState({ state: null }));
    return;
  }

  const formattedTrack = formatLocalTrack(currentTrack);

  const playbackState: any = {
    paused: !isPlaying,
    position: Math.round((audioElement.currentTime || 0) * 1000),
    duration: Math.round((audioElement.duration || (currentTrack.duration_seconds || 180)) * 1000),
    repeat_mode: repeatMode === 'track' ? 2 : repeatMode === 'context' ? 1 : 0,
    shuffle: isShuffle,
    context: {
      uri: currentTrack.uri || `spotify:track:${currentTrack.id}`,
    },
    track_window: {
      current_track: formattedTrack,
      next_tracks: currentQueue.slice(currentIndex + 1).map(formatLocalTrack),
      previous_tracks: currentQueue.slice(0, currentIndex).map(formatLocalTrack),
    },
    disallows: {
      pausing: !isPlaying,
      resuming: isPlaying,
      skipping_next: currentQueue.length <= 1,
      skipping_prev: false,
    },
  };

  store.dispatch(spotifyActions.setState({ state: playbackState }));
};

audioElement.addEventListener('timeupdate', () => {
  notifyState();
});

audioElement.addEventListener('play', () => {
  isPlaying = true;
  notifyState();
});

audioElement.addEventListener('pause', () => {
  isPlaying = false;
  notifyState();
});

audioElement.addEventListener('ended', () => {
  if (repeatMode === 'track') {
    audioElement.currentTime = 0;
    audioElement.play().catch(() => { });
  } else if (currentIndex < currentQueue.length - 1) {
    nextTrack();
  } else if (repeatMode === 'context' && currentQueue.length > 0) {
    currentIndex = 0;
    playCurrentIndex();
  } else {
    isPlaying = false;
    notifyState();
  }
});

const recordHistory = async (trackId: any) => {
  if (!trackId) return;
  try {
    await axios.post('/api/history/', { track_id: trackId });
  } catch (e) {
    /* ignore history record errors */
  }
};

let pendingPlayPromise: Promise<void> | null = null;
let currentPlayRequestId = 0;

const isSameSrc = (currentSrc: string, targetUrl: string) => {
  if (!currentSrc || !targetUrl) return false;
  try {
    const currentAbs = new URL(currentSrc, window.location.href).href;
    const targetAbs = new URL(targetUrl, window.location.href).href;
    return currentAbs === targetAbs;
  } catch (e) {
    return currentSrc === targetUrl;
  }
};

const playCurrentIndex = async () => {
  let track = currentQueue[currentIndex];
  if (!track) return;

  const requestId = ++currentPlayRequestId;

  let audioUrl = normalizeMediaUrl(track.audio_file);

  if (!audioUrl || !audioUrl.startsWith('http') || audioUrl.includes('youtube.com')) {
    try {
      const trackId = String(track.id || track.uri?.split(':').pop() || '');
      const res = await axios.get('/api/tracks/');
      if (requestId !== currentPlayRequestId) return;
      const allTracks = res.data || [];
      const found = allTracks.find((t: any) => String(t.id) === trackId);
      if (found && found.audio_file) {
        audioUrl = normalizeMediaUrl(found.audio_file);
        track.audio_file = audioUrl;
      }
    } catch (e) {
      console.warn('Could not fetch audio_file for track', e);
    }
  }

  if (requestId !== currentPlayRequestId) return;

  if (!audioUrl && track.media_url && track.media_url.startsWith('http')) {
    audioUrl = normalizeMediaUrl(track.media_url);
  }

  if (audioUrl && audioUrl.startsWith('http')) {
    if (pendingPlayPromise) {
      try {
        await pendingPlayPromise;
      } catch (e) {
        /* ignore pending promise interruption */
      }
    }

    if (requestId !== currentPlayRequestId) return;

    const same = isSameSrc(audioElement.src, audioUrl);

    if (!same) {
      audioElement.pause();
      audioElement.src = audioUrl;
    } else if (!audioElement.paused) {
      // Already playing target track URL
      isPlaying = true;
      notifyState();
      return;
    }

    try {
      pendingPlayPromise = audioElement.play();
      await pendingPlayPromise;
      if (requestId === currentPlayRequestId) {
        isPlaying = true;
        void recordHistory(track.id);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('Playback error:', e);
      }
      isPlaying = !audioElement.paused;
    } finally {
      if (requestId === currentPlayRequestId) {
        pendingPlayPromise = null;
      }
    }
  } else {
    console.error('No playable audio URL found for track:', track);
  }
  notifyState();
};

export const setPlaybackDevice = (_deviceId: string | null) => { };
export const setPlaybackDeviceName = (_name: string | null) => { };

const fetchPlaybackState = async () => {
  notifyState();
  return null;
};

const transferPlayback = async (_deviceId: string) => { };

const getAvailableDevices = async () => {
  return {
    devices: [
      {
        id: 'html5_player',
        is_active: true,
        is_private_session: false,
        is_restricted: false,
        name: 'YouTube HTML5 Player',
        type: 'Computer',
        volume_percent: Math.round(audioElement.volume * 100),
      },
    ],
  };
};

const startPlayback = async (
  body: {
    context_uri?: string;
    uris?: string[];
    offset?: { position: number };
    track?: any;
    tracks?: any[];
  } = {}
) => {
  const curTrack = currentQueue[currentIndex];
  const curId = curTrack ? String(curTrack.id || curTrack.uri?.split(':').pop()) : '';

  let targetId: string | null = null;
  if (body.uris && body.uris.length === 1) {
    targetId = body.uris[0].replace(/^spotify:track:/, '');
  } else if (body.track) {
    targetId = String(body.track.id || body.track.uri?.split(':').pop() || '');
  }

  // If the exact same track is requested:
  if (targetId && targetId === curId) {
    if (!audioElement.paused || pendingPlayPromise !== null) {
      isPlaying = true;
      notifyState();
      return;
    }
    // Resume if paused
    if (audioElement.src && audioElement.paused) {
      try {
        pendingPlayPromise = audioElement.play();
        await pendingPlayPromise;
        isPlaying = true;
      } catch (e: any) {
        if (e.name !== 'AbortError') console.warn('Resume error:', e);
      } finally {
        pendingPlayPromise = null;
      }
      notifyState();
      return;
    }
  }

  // 1. Explicit tracks list provided
  if (body.tracks && body.tracks.length > 0) {
    currentQueue = body.tracks.map(formatLocalTrack);
    if (body.track) {
      const idx = currentQueue.findIndex((t: any) => String(t.id) === String(body.track.id));
      currentIndex = idx >= 0 ? idx : body.offset?.position || 0;
    } else {
      currentIndex = body.offset?.position || 0;
    }
    await playCurrentIndex();
    return;
  }

  // 2. context_uri is provided (album, playlist, artist, liked, etc.)
  if (body.context_uri) {
    const uri = String(body.context_uri);
    let fetchedTracks: any[] = [];

    if (uri.includes('playlist')) {
      const playlistId = uri.split(':').pop() || '';
      const res = await axios.get(`/api/playlists/${playlistId}/`).catch(() => ({ data: null }));
      if (res.data?.tracks) {
        fetchedTracks = res.data.tracks.map(formatLocalTrack);
      }
    } else if (uri.includes('artist')) {
      const artistId = uri.split(':').pop() || '';
      const res = await axios.get(`/api/artists/${artistId}/audios/`).catch(() => ({ data: [] }));
      fetchedTracks = (res.data || []).map(formatLocalTrack);
    } else if (uri.includes('album')) {
      const albumId = uri.split(':').pop() || '';
      const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
      const all = (res.data || []).map(formatLocalTrack);
      const filtered = all.filter((t: any) => String(t.album?.id) === String(albumId));
      fetchedTracks = filtered.length > 0 ? filtered : all;
    } else if (uri.includes('collection') || uri.includes('liked')) {
      const res = await axios.get('/api/favorites/').catch(() => ({ data: [] }));
      fetchedTracks = (res.data || []).map((fav: any) => formatLocalTrack(fav.media_file)).filter(Boolean);
    }

    if (fetchedTracks.length > 0) {
      currentQueue = fetchedTracks;
      if (body.track) {
        const idx = currentQueue.findIndex((t: any) => String(t.id) === String(body.track.id));
        currentIndex = idx >= 0 ? idx : body.offset?.position || 0;
      } else {
        currentIndex = body.offset?.position || 0;
      }
      await playCurrentIndex();
      return;
    }
  }

  // 3. uris array provided
  if (body.uris && body.uris.length > 0) {
    const rawAllTracks = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    const allTracks = (rawAllTracks.data || []).map(formatLocalTrack);
    const targetUris = body.uris.map((u) => u.replace(/^spotify:track:/, ''));
    const matched = allTracks.filter((t: any) => targetUris.includes(String(t.id)) || body.uris!.includes(t.uri));

    if (matched.length > 0) {
      currentQueue = matched;
      if (body.track) {
        const idx = currentQueue.findIndex((t: any) => String(t.id) === String(body.track.id));
        currentIndex = idx >= 0 ? idx : body.offset?.position || 0;
      } else {
        currentIndex = body.offset?.position || 0;
      }
      await playCurrentIndex();
      return;
    }
  }

  // 4. Single track provided (e.g. clicked on song row)
  if (body.track) {
    const formattedTarget = formatLocalTrack(body.track);
    const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    const allTracks = (res.data || []).map(formatLocalTrack);

    if (allTracks.length > 0) {
      currentQueue = allTracks;
      const idx = currentQueue.findIndex((t: any) => String(t.id) === String(formattedTarget.id));
      if (idx >= 0) {
        currentIndex = idx;
      } else {
        currentQueue = [formattedTarget, ...allTracks];
        currentIndex = 0;
      }
    } else {
      currentQueue = [formattedTarget];
      currentIndex = 0;
    }
    await playCurrentIndex();
    return;
  }

  // 5. Currently playing audio is paused -> resume
  if (audioElement.src && audioElement.paused) {
    try {
      pendingPlayPromise = audioElement.play();
      await pendingPlayPromise;
      isPlaying = true;
    } catch (e: any) {
      if (e.name !== 'AbortError') console.warn('Resume error:', e);
    } finally {
      pendingPlayPromise = null;
    }
    notifyState();
    return;
  }

  // 6. Non-empty queue exists -> play current track
  if (currentQueue.length > 0) {
    await playCurrentIndex();
    return;
  }

  // 7. Fallback: Fetch all tracks and play first
  const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
  const tracks = (res.data || []).map(formatLocalTrack);
  if (tracks.length > 0) {
    currentQueue = tracks;
    currentIndex = 0;
    await playCurrentIndex();
  }
};

const pausePlayback = async () => {
  if (pendingPlayPromise) {
    try {
      await pendingPlayPromise;
    } catch (e) {
      /* ignore */
    }
  }
  audioElement.pause();
  isPlaying = false;
  notifyState();
};

const nextTrack = async () => {
  if (currentQueue.length === 0) {
    const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    currentQueue = (res.data || []).map(formatLocalTrack);
  }
  if (currentQueue.length === 0) return;

  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * currentQueue.length);
  } else {
    currentIndex = (currentIndex + 1) % currentQueue.length;
  }
  await playCurrentIndex();
};

const previousTrack = async () => {
  if (currentQueue.length === 0) {
    const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    currentQueue = (res.data || []).map(formatLocalTrack);
  }
  if (currentQueue.length === 0) return;

  if (audioElement.currentTime > 3) {
    audioElement.currentTime = 0;
    notifyState();
    return;
  }

  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * currentQueue.length);
  } else {
    currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  }
  await playCurrentIndex();
};

const seekToPosition = async (position_ms: number) => {
  audioElement.currentTime = position_ms / 1000;
  notifyState();
};

const setRepeatMode = async (state: 'track' | 'context' | 'off') => {
  repeatMode = state;
  notifyState();
};

const setVolume = async (volume_percent: number) => {
  audioElement.volume = Math.max(0, Math.min(1, volume_percent / 100));
  notifyState();
};

const toggleShuffle = async (state: boolean) => {
  isShuffle = state;
  notifyState();
};

const addToQueue = async (uri: string) => {
  currentQueue.push({ id: uri, uri, title: 'Queued Track' });
  notifyState();
};

const getRecentlyPlayed = async (_params: { limit?: number; after?: number; before?: number } = {}) => {
  try {
    const response = await axios.get('/api/history/').catch(() => ({ data: [] }));
    const data = response.data || [];
    const items = data
      .map((item: any) => {
        const trackObj = item.media_file ? formatLocalTrack(item.media_file) : null;
        if (!trackObj) return null;
        return {
          track: trackObj,
          played_at: item.played_at || new Date().toISOString(),
          context: {
            type: 'artist',
            uri: `spotify:artist:${item.media_file?.artist_id || 1}`,
          },
        };
      })
      .filter((i: any) => i !== null && i.track !== null);

    if (items.length === 0) {
      const tracksRes = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
      const tracks = (tracksRes.data || []).map(formatLocalTrack).filter(Boolean);
      return {
        items: tracks.slice(0, 10).map((t: any) => ({
          track: t,
          played_at: new Date().toISOString(),
          context: {
            type: 'artist',
            uri: `spotify:artist:${t.artists?.[0]?.id || 1}`,
          },
        })),
      };
    }

    return { items };
  } catch (e) {
    return { items: [] };
  }
};

let currentTempoPercent = 0;
let currentKeySemitones = 0;
let currentLeadVocalGain = 100;
let currentBackingVocalGain = 100;
let currentInstrumentalGain = 100;

export const setTempo = async (tempoPercent: number) => {
  currentTempoPercent = Math.max(-50, Math.min(50, tempoPercent));
  const rate = 1 + (currentTempoPercent / 100);
  audioElement.playbackRate = Math.max(0.5, Math.min(2.0, rate));
  (audioElement as any).preservesPitch = true;
  (audioElement as any).webkitPreservesPitch = true;
  (audioElement as any).mozPreservesPitch = true;
  notifyState();
};

export const setKeyShift = async (semitones: number) => {
  currentKeySemitones = Math.max(-12, Math.min(12, semitones));
  const pitchRatio = Math.pow(2, currentKeySemitones / 12);
  const baseRate = 1 + (currentTempoPercent / 100);
  if (currentKeySemitones !== 0) {
    (audioElement as any).preservesPitch = false;
    (audioElement as any).webkitPreservesPitch = false;
    (audioElement as any).mozPreservesPitch = false;
    audioElement.playbackRate = Math.max(0.5, Math.min(2.0, baseRate * pitchRatio));
  } else {
    (audioElement as any).preservesPitch = true;
    (audioElement as any).webkitPreservesPitch = true;
    (audioElement as any).mozPreservesPitch = true;
    audioElement.playbackRate = Math.max(0.5, Math.min(2.0, baseRate));
  }
  notifyState();
};

export const setVocalControl = async (leadVocal: number, backingVocals: number, instrumental: number) => {
  currentLeadVocalGain = leadVocal;
  currentBackingVocalGain = backingVocals;
  currentInstrumentalGain = instrumental;
  notifyState();
};

export const playStemMode = async (trackId: string | number, mode: 'full' | 'vocal_only' | 'beat_only' | 'vocal_mute') => {
  try {
    const res = await axios.get(`/api/media/${trackId}/stem/`, { params: { mode } });
    if (res.data && res.data.audio_url) {
      const audioUrl = res.data.audio_url;
      const curTime = audioElement.currentTime || 0;
      const wasPlaying = isPlaying;

      if (!isSameSrc(audioElement.src, audioUrl)) {
        audioElement.pause();
        audioElement.src = audioUrl;
        try {
          audioElement.currentTime = curTime;
        } catch { }
        if (wasPlaying) {
          pendingPlayPromise = audioElement.play();
          await pendingPlayPromise;
          isPlaying = true;
        }
      }
      notifyState();
      return res.data;
    }
  } catch (e) {
    console.warn('Failed to fetch backend stem mode:', e);
  }
};

export const playerService = {
  addToQueue,
  setPlaybackDevice,
  setPlaybackDeviceName,
  fetchPlaybackState,
  transferPlayback,
  startPlayback,
  pausePlayback,
  nextTrack,
  previousTrack,
  setRepeatMode,
  setVolume,
  toggleShuffle,
  seekToPosition,
  getRecentlyPlayed,
  getAvailableDevices,
  setTempo,
  setKeyShift,
  setVocalControl,
  playStemMode,
};
