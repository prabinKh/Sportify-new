import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Utils
import axios from '../../axios';
import login from '../../utils/spotify/login';

// Services
import { authService } from '../../services/auth';

// Interfaces
import type { User } from '../../interfaces/user';
import { getFromLocalStorageWithExpiry } from '../../utils/localstorage';

const defaultUser: User = ({
  id: 'guest',
  display_name: 'Guest Listener',
  email: 'guest@sportify.local',
  images: [{ url: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png', height: 300, width: 300 }],
} as unknown) as User;

const initialState: { token?: string; playerLoaded: boolean; user?: User; requesting: boolean } = {
  user: defaultUser,
  requesting: false,
  playerLoaded: false,
  token: localStorage.getItem('access_token') || undefined,
};

export const loginToSpotify = createAsyncThunk<{ token?: string; loaded: boolean }>(
  'auth/loginToSpotify',
  async (_, thunkAPI) => {
    const userToken: string | undefined = localStorage.getItem('access_token') || undefined;

    if (userToken) {
      axios.defaults.headers.common['Authorization'] = 'Token ' + userToken;
      thunkAPI.dispatch(fetchUser());
      return { token: userToken, loaded: false };
    }

    let [requestedToken, requestUser] = await login.getToken();
    if (requestUser) thunkAPI.dispatch(fetchUser());

    if (!requestedToken) {
      login.logInWithSpotify();
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

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { username: string; password: string }, thunkAPI) => {
    try {
      const data = await authService.login(credentials);
      return data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.error || err.response?.data || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: { username: string; email?: string; password: string; display_name?: string }, thunkAPI) => {
    try {
      const data = await authService.register(userData);
      return data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data || 'Registration failed');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (
    profileData: { display_name?: string; avatar_url?: string; email?: string; avatar?: File },
    thunkAPI
  ) => {
    try {
      const data = await authService.updateProfile(profileData);
      return data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.error || err.response?.data || 'Failed to update profile');
    }
  }
);

export const performLogout = createAsyncThunk(
  'auth/performLogout',
  async (_, thunkAPI) => {
    await authService.logout();
    thunkAPI.dispatch(authActions.logout());
  }
);

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
    logout(state) {
      state.user = defaultUser;
      state.token = undefined;
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    },
    setUser(state, action: PayloadAction<User | undefined>) {
      state.user = action.payload;
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
    builder.addCase(loginUser.fulfilled, (state, action) => {
      if (action.payload.user) {
        state.user = action.payload.user;
        state.token = action.payload.token;
      }
      state.requesting = false;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      if (action.payload.user) {
        state.user = action.payload.user;
        state.token = action.payload.token;
      }
      state.requesting = false;
    });
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      if (action.payload.user) {
        state.user = action.payload.user;
      }
    });
  },
});

export const authActions = { ...authSlice.actions, loginToSpotify, fetchUser, loginUser, registerUser, updateUserProfile, performLogout };

export default authSlice.reducer;
