import axios from '../axios';
import { formatLocalPlaylist, formatLocalTrack } from '../utils';

const normalizePlaylist = (p: any) => {
  if (p && !p.tracks && p.items) p.tracks = p.items;
  return p;
};

const getPlaylist = async (playlistId: string) => {
  const response = await axios.get(`/api/playlists/${playlistId}/`);
  const formatted = formatLocalPlaylist(response.data);
  return { data: formatted };
};

const getPlaylistItems = async (
  playlistId: string,
  _params: any = { limit: 50 }
) => {
  const response = await axios.get(`/api/playlists/${playlistId}/`);
  const tracks = (response.data?.tracks || []).map(formatLocalTrack);
  const items = tracks.map((t: any) => ({ track: t, added_at: t.downloaded_at }));
  return { data: { items, total: items.length } };
};

const getMyPlaylists = async (_params: any = {}) => {
  const response = await axios.get('/api/playlists/');
  const items = (response.data || []).map(formatLocalPlaylist);
  return { data: { items, total: items.length } };
};

const getFeaturedPlaylists = async (_params: any = {}) => {
  const response = await axios.get('/api/playlists/');
  let items = (response.data || []).map(formatLocalPlaylist);
  if (items.length === 0) {
    const tracksRes = await axios.get('/api/tracks/');
    const tracks = (tracksRes.data || []).map(formatLocalTrack);
    if (tracks.length > 0) {
      items = [
        {
          id: 'featured-top-hits',
          name: 'Top YouTube Audio Hits',
          description: 'The most popular downloaded tracks',
          images: tracks[0]?.album?.images || [{ url: '' }],
          tracks: { total: tracks.length, items: tracks.map((t: any) => ({ track: t })) },
          owner: { display_name: 'YouTube Mix', id: 'youtube_user' },
          collaborative: false,
          public: true,
        },
        {
          id: 'featured-daily-mix',
          name: 'Daily Mix',
          description: 'Fresh tracks tailored for you',
          images: tracks[1]?.album?.images || tracks[0]?.album?.images || [{ url: '' }],
          tracks: { total: tracks.length, items: tracks.map((t: any) => ({ track: t })) },
          owner: { display_name: 'YouTube Mix', id: 'youtube_user' },
          collaborative: false,
          public: true,
        },
      ];
    }
  }
  return { data: { playlists: { items, total: items.length } } };
};

const extractTrackId = (raw: string): string => {
  if (!raw) return '';
  const str = String(raw);
  if (str.startsWith('spotify:track:')) {
    return str.replace('spotify:track:', '');
  }
  const clean = str.replace(/\/$/, '');
  const parts = clean.split('/');
  return parts[parts.length - 1] || str;
};

const addPlaylistItems = async (playlistId: string, uris: string[], _snapshotId?: string) => {
  const trackId = extractTrackId(uris[0]);
  return axios.post(`/api/playlists/${playlistId}/tracks/`, { track_id: trackId });
};

const removePlaylistItems = async (playlistId: string, uris: string[], _snapshotId?: string) => {
  const trackId = extractTrackId(uris[0]);
  return axios.delete(`/api/playlists/${playlistId}/tracks/`, { data: { track_id: trackId } });
};

const reorderPlaylistItems = async (
  _playlistId: string,
  _uris: string[],
  _rangeStart: number,
  _insertBefore: number,
  _rangeLength: number,
  _snapshotId: string
) => {
  return { data: {} };
};

const changePlaylistDetails = async (
  playlistId: string,
  data: any
) => {
  const res = await axios.patch(`/api/playlists/${playlistId}/`, data);
  return { data: formatLocalPlaylist(res.data) };
};

const deletePlaylist = async (playlistId: string) => {
  return axios.delete(`/api/playlists/${playlistId}/`);
};

const changePlaylistImage = async (_playlistId: string, _image: string, _content: string) => {
  return { data: {} };
};

const createPlaylist = async (
  _userId: string,
  data: {
    name: string;
    public?: boolean;
    collaborative?: boolean;
    description?: string;
  }
) => {
  const res = await axios.post('/api/playlists/', {
    name: data.name || 'New Playlist',
    description: data.description || '',
  });
  return { data: formatLocalPlaylist(res.data) };
};

const getRecommendations = async (_params: any) => {
  const response = await axios.get('/api/tracks/');
  const tracks = (response.data || []).map(formatLocalTrack);
  return { data: { tracks } };
};

const getPlaylists = async (
  _userId: string,
  _params: any = {}
) => {
  return getMyPlaylists();
};

export const playlistService = {
  getPlaylist,
  getPlaylists,
  getMyPlaylists,
  createPlaylist,
  deletePlaylist,
  getPlaylistItems,
  addPlaylistItems,
  getRecommendations,
  changePlaylistImage,
  removePlaylistItems,
  getFeaturedPlaylists,
  reorderPlaylistItems,
  changePlaylistDetails,
};


