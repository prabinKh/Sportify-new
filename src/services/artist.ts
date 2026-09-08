import axios from '../axios';
import { formatLocalArtist, formatLocalTrack } from '../utils';

const fetchArtist = async (id: string) => {
  const res = await axios.get(`/api/artists/${id}/`);
  return { data: formatLocalArtist(res.data) };
};

const fetchArtists = async (ids: string[]) => {
  const res = await axios.get('/api/artists/');
  const all = (res.data || []).map(formatLocalArtist);
  const filtered = ids.length ? all.filter((a: any) => ids.includes(a.id)) : all;
  return { data: { artists: filtered } };
};

const fetchArtistAlbums = async (
  id: string,
  _params: any = {}
) => {
  const res = await axios.get(`/api/artists/${id}/audios/`);
  const tracks = (res.data || []).map(formatLocalTrack);
  const mockAlbum = {
    id: `album_${id}`,
    name: 'Downloaded Audios',
    album_type: 'album',
    images: tracks[0]?.album?.images || [{ url: '' }],
    artists: [{ id, name: 'Artist' }],
    total_tracks: tracks.length,
  };
  return {
    data: {
      href: '',
      items: [mockAlbum],
      limit: 50,
      next: null,
      offset: 0,
      previous: null,
      total: 1,
    },
  };
};

const fetchArtistTopTracks = async (id: string) => {
  const res = await axios.get(`/api/artists/${id}/audios/`);
  const tracks = (res.data || []).map(formatLocalTrack);
  return { data: { tracks } };
};

const fetchSimilarArtists = async (_id: string) => {
  const res = await axios.get('/api/artists/');
  const all = (res.data || []).map(formatLocalArtist);
  return { data: { artists: all.slice(0, 5) } };
};

export const artistService = {
  fetchArtist,
  fetchArtists,
  fetchArtistAlbums,
  fetchArtistTopTracks,
  fetchSimilarArtists,
};

