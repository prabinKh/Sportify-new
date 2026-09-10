import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// Services
import { userService } from '../../services/users';
import { playlistService } from '../../services/playlists';

// Interface
import type { RootState } from '../store';
import type { User } from '../../interfaces/user';
import type { Track, TrackWithSave } from '../../interfaces/track';
import type { Artist } from '../../interfaces/artist';
import type { Pagination } from '../../interfaces/api';
import type { Playlist } from '../../interfaces/playlists';
import { updateUserProfile } from './auth';

const initialState: {
  user: User | null;
  artists: Artist[];
  following: boolean;
  playlists: Playlist[];
  songs: TrackWithSave[];
} = {
  songs: [],
  user: null,
  artists: [],
  playlists: [],
  following: false,
};

const fetchMyArtists = createAsyncThunk<Artist[], void>(
  'profile/fetchMyArtists',
  async (_, _api) => {
    try {
      const followedRes = await userService.fetchFollowedArtists({ limit: 50 });
      const followed = followedRes.data?.artists?.items || [];
      const allRes = await userService.fetchTopArtists({ limit: 50 });
      const all = allRes.data?.items || [];
      const seen = new Set(followed.map((a: any) => String(a.id)));
      const combined = [...followed];
      for (const artist of all) {
        if (!seen.has(String(artist.id))) {
          seen.add(String(artist.id));
          combined.push(artist);
        }
      }
      return combined;
    } catch {
      const allRes = await userService.fetchTopArtists({ limit: 50 });
      return allRes.data?.items || [];
    }
  }
);

const fetchPlaylists = createAsyncThunk<Playlist[], string>(
  'profile/fetchMyPlaylists',
  async (id, _api) => {
    const response = await playlistService.getPlaylists(id, { limit: 50 });
    return response.data.items;
  }
);

const fetchMyTracks = createAsyncThunk<TrackWithSave[], void>(
  'profile/fetchMyTracks',
  async (_, _api) => {
    const response = await userService.fetchTopTracks({
      limit: 50,
      timeRange: 'short_term',
    });
    const tracks = response.data.items;

    const saved = await userService
      .checkSavedTracks(tracks.map((t) => t.id))
      .then((res) => res.data);

    return tracks.map((track, i) => {
      return {
        ...track,
        saved: saved[i],
      };
    });
  }
);

const fetchCurrentUserData = createAsyncThunk<[Artist[], TrackWithSave[]], void>(
  'profile/fetchCurrentUserData',
  async (_, _api) => {
    const promises = [
      userService.fetchFollowedArtists({ limit: 10 }),
      userService.fetchTopTracks({
        limit: 10,
        timeRange: 'short_term',
      }),
    ];

    const responses = await Promise.all(promises).then((res) => res.map((r) => r.data));
    const [artistsResponse, tracksResponse]: [
      {
        artists: Pagination<Artist>;
      },
      Pagination<Track>
    ] = responses as any;

    const artists = artistsResponse.artists.items;
    const tracks = tracksResponse.items;

    const saved = await userService
      .checkSavedTracks(tracks.map((t) => t.id))
      .then((res) => res.data);

    const tracksWithSave: TrackWithSave[] = tracks.map((track, i) => {
      return {
        ...track,
        saved: saved[i],
      };
    });

    return [artists, tracksWithSave];
  }
);

const isSameUser = (u: any, id: string) => {
  if (!u || !id) return false;
  return (
    String(u.id) === String(id) ||
    u.username === id ||
    id === 'me' ||
    (u.id === 'guest' && (id === 'guest' || id === 'youtube_user'))
  );
};

const fetchUser = createAsyncThunk<[User, Playlist[], boolean], string>(
  'profile/fetchUser',
  async (id, api) => {
    const { auth } = api.getState() as RootState;
    const authUser = auth.user;

    const isCurrent = isSameUser(authUser, id);

    if (isCurrent) {
      api.dispatch(fetchCurrentUserData());
    }

    const promises = [
      isCurrent && authUser ? Promise.resolve({ data: authUser }) : userService.getUser(id),
      playlistService.getPlaylists(id, { limit: 10 }),
      isCurrent
        ? userService.checkFollowingUsers([id]).catch(() => {
            return { data: [true] };
          })
        : Promise.resolve({ data: [true] }),
    ];
    const responses = await Promise.all(promises);
    const [userData, playlistsData, following] = responses;

    return [
      userData.data as User,
      (playlistsData.data as Pagination<Playlist>).items,
      (following.data as boolean[])[0],
    ];
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfileUser: (state, action) => {
      state.user = action.payload;
    },
    removeUser: (state) => {
      state.user = null;
      state.following = false;
      state.playlists = [];
      state.artists = [];
      state.songs = [];
    },
    setLinkedStateForTrack: (state, action) => {
      state.songs = state.songs.map((track) => {
        if (track.id === action.payload.id) {
          return {
            ...track,
            saved: action.payload.saved,
          };
        }
        return track;
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUser.fulfilled, (state, action) => {
      state.user = action.payload[0];
      state.playlists = action.payload[1];
      state.following = action.payload[2];
    });
    builder.addCase(fetchMyArtists.fulfilled, (state, action) => {
      state.artists = action.payload;
    });
    builder.addCase(fetchCurrentUserData.fulfilled, (state, action) => {
      state.artists = action.payload[0];
      state.songs = action.payload[1];
    });
    builder.addCase(fetchPlaylists.fulfilled, (state, action) => {
      state.playlists = action.payload.filter((p) => p.public);
    });
    builder.addCase(fetchMyTracks.fulfilled, (state, action) => {
      state.songs = action.payload;
    });
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      if (action.payload.user) {
        state.user = action.payload.user;
      }
    });
  },
});

export const profileActions = {
  fetchUser,
  fetchPlaylists,
  fetchMyArtists,
  fetchMyTracks,
  ...profileSlice.actions,
};

export default profileSlice.reducer;
