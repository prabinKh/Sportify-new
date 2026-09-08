import axios from '../axios';
import { formatLocalArtist, formatLocalTrack } from '../utils';

const fetchTopTracks = async (_params: any = {}) => {
  const res = await axios.get('/api/tracks/');
  const items = (res.data || []).map(formatLocalTrack);
  return { data: { items, total: items.length } };
};

const fetchTopArtists = async (_params: any = {}) => {
  const res = await axios.get('/api/artists/');
  const items = (res.data || []).map(formatLocalArtist);
  return { data: { items, total: items.length } };
};

const fetchFollowedArtists = async (_params: any = {}) => {
  try {
    const res = await axios.get('/api/following/artists/');
    const items = (res.data || []).map((item: any) => formatLocalArtist(item.channel || item));
    return { data: { artists: { items, total: items.length } } };
  } catch (e) {
    return { data: { artists: { items: [], total: 0 } } };
  }
};

const fetchQueue = async () => {
  return { data: { currently_playing: null, queue: [] } };
};

const checkSavedTracks = async (ids: string[]) => {
  try {
    const res = await axios.get('/api/favorites/');
    const favIds = (res.data || []).map((f: any) => String(f.media_file?.id));
    const result = ids.map((id) => favIds.includes(String(id)));
    return { data: result };
  } catch (e) {
    return { data: ids.map(() => false) };
  }
};

const saveTracks = async (ids: string[]) => {
  for (const id of ids) {
    await axios.post('/api/favorites/toggle/', { track_id: id }).catch(() => {});
  }
  return { data: {} };
};

const deleteTracks = async (ids: string[]) => {
  for (const id of ids) {
    await axios.post('/api/favorites/toggle/', { track_id: id }).catch(() => {});
  }
  return { data: {} };
};

const checkFollowedPlaylist = async (_playlistId: string) => {
  return { data: [false] };
};

const checkFollowingArtists = async (ids: string[]) => {
  try {
    const res = await axios.get(`/api/following/artists/contains/?ids=${ids.join(',')}`);
    return { data: res.data || ids.map(() => false) };
  } catch (e) {
    return { data: ids.map(() => false) };
  }
};

const checkFollowingUsers = async (ids: string[]) => {
  return { data: ids.map(() => false) };
};

const getUser = async (_id: string) => {
  return {
    data: {
      id: 'youtube_user',
      display_name: 'YouTube Listener',
      images: [{ url: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' }],
    },
  };
};

const unfollowPlaylist = async (_playlistId: string) => {
  return { data: {} };
};

const followPlaylist = async (_playlistId: string) => {
  return { data: {} };
};

const followArtists = async (ids: string[]) => {
  for (const id of ids) {
    await axios.post('/api/following/artists/toggle/', { artist_id: id }).catch(() => {});
  }
  return { data: {} };
};

const unfollowArtists = async (ids: string[]) => {
  for (const id of ids) {
    await axios.post('/api/following/artists/toggle/', { artist_id: id }).catch(() => {});
  }
  return { data: {} };
};

const followUsers = async (_ids: string[]) => {
  return { data: {} };
};

const unfollowUsers = async (_ids: string[]) => {
  return { data: {} };
};

const getSavedTracks = async (_params: any = {}) => {
  const res = await axios.get('/api/favorites/');
  const items = (res.data || []).map((fav: any) => ({
    track: formatLocalTrack(fav.media_file),
    added_at: fav.created_at,
  }));
  return { data: { items, total: items.length } };
};

export const userService = {
  getUser,
  saveTracks,
  fetchQueue,
  deleteTracks,
  getSavedTracks,
  fetchTopArtists,
  fetchTopTracks,
  checkSavedTracks,
  followPlaylist,
  checkFollowingUsers,
  followUsers,
  unfollowUsers,
  fetchFollowedArtists,
  checkFollowedPlaylist,
  unfollowPlaylist,
  checkFollowingArtists,
  followArtists,
  unfollowArtists,
};

