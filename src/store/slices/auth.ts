import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Utils
import axios from '../../axios';
import login from '../../utils/spotify/login';

// Services
import { authService } from '../../services/auth';

// Interfaces
import type { User } from '../../interfaces/user';
import { getFromLocalStorageWithExpiry } from '../../utils/localstorage';

// Auth is bypassed — treat the session as always authenticated so the app
// renders all pages without a login gate. A real Spotify token from localStorage
// is still picked up by axios if present.
const STUB_USER: User = {
  id: 'local',
  display_name: 'Guest',
  email: '',
  images: [],
  product: 'premium',
  country: 'US',
  followers: { href: null, total: 0 },
  href: '',
  type: 'user',
  uri: '',
  external_urls: { spotify: '' },
} as unknown as User;

const initialState: { token?: string; playerLoaded: boolean; user?: User; requesting: boolean } = {
  user: STUB_USER,
  requesting: false,
  playerLoaded: false,
  token: getFromLocalStorageWithExpiry('access_token') || undefined,
};

export const loginToSpotify = createAsyncThunk<{ token?: string; loaded: boolean }>(
  'auth/loginToSpotify',
  async (_, thunkAPI) => {
    const userToken: string | undefined = getFromLocalStorageWithExpiry('access_token') as string;

    if (userToken) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + userToken;
      thunkAPI.dispatch(fetchUser());
      return { token: userToken, loaded: false };
    }

    let [requestedToken, requestUser] = await login.getToken();
    if (requestUser) thunkAPI.dispatch(fetchUser());

    if (!requestedToken) {
      // Auth is bypassed — do NOT redirect to Spotify login.
    } else {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + requestedToken;
    }

    return { token: requestedToken, loaded: true };
  }
);

export const fetchUser = createAsyncThunk('auth/fetchUser', async () => {
  const response = await authService.fetchUser();
  return response.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setRequesting(state, action: PayloadAction<{ requesting: boolean }>) {
      state.requesting = action.payload.requesting;
    },
    setToken(state, action: PayloadAction<{ token?: string }>) {
      state.token = action.payload.token;
    },
    setPlayerLoaded(state, action: PayloadAction<{ playerLoaded: boolean }>) {
      state.playerLoaded = action.payload.playerLoaded;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginToSpotify.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.requesting = !action.payload.loaded;
    });
    builder.addCase(fetchUser.fulfilled, (state, action) => {
      state.user = action.payload;
      state.requesting = false;
    });
  },
});

export const authActions = { ...authSlice.actions, loginToSpotify, fetchUser };

export default authSlice.reducer;
