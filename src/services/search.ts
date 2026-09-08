import axios from '../axios';
import { formatLocalArtist, formatLocalPlaylist, formatLocalTrack } from '../utils';

export const querySearch = async (params: {
  q: string;
  type?: string;
  limit?: number;
  offset?: number;
}) => {
  const q = params.q || '';
  const [tracksRes, artistsRes, playlistsRes] = await Promise.all([
    axios.get(`/api/tracks/search/`, { params: { q } }).catch(() => ({ data: [] })),
    axios.get('/api/artists/').catch(() => ({ data: [] })),
    axios.get('/api/playlists/').catch(() => ({ data: [] })),
  ]);

  const rawTracks = tracksRes.data || [];
  const rawArtists = artistsRes.data || [];
  const rawPlaylists = playlistsRes.data || [];

  const tracks = rawTracks.map(formatLocalTrack);
  const artists = rawArtists
    .filter((a: any) => !q || a.name.toLowerCase().includes(q.toLowerCase()))
    .map(formatLocalArtist);
  const playlists = rawPlaylists
    .filter((p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .map(formatLocalPlaylist);

  return {
    data: {
      tracks: { items: tracks, total: tracks.length },
      artists: { items: artists, total: artists.length },
      playlists: { items: playlists, total: playlists.length },
      albums: { items: [], total: 0 },
    },
  };
};

export const searchEpisodes = async (_params: any) => {
  return { data: { episodes: { items: [], total: 0 } } };
};

