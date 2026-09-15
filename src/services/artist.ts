import axios from '../axios';
import { formatLocalArtist, formatLocalTrack, formatLocalPlaylist } from '../utils';

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

export const sortTracksByLatestDownload = (tracks: any[]): any[] => {
  return [...tracks].sort((a: any, b: any) => {
    const rawTimeA = a?.downloaded_at || a?.created_at;
    const rawTimeB = b?.downloaded_at || b?.created_at;
    const timeA = rawTimeA ? new Date(rawTimeA).getTime() : 0;
    const timeB = rawTimeB ? new Date(rawTimeB).getTime() : 0;
    const validTimeA = isNaN(timeA) ? 0 : timeA;
    const validTimeB = isNaN(timeB) ? 0 : timeB;

    if (validTimeB !== validTimeA) {
      return validTimeB - validTimeA;
    }
    return (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });
};

const fetchArtistAlbums = async (
  id: string,
  _params: any = {}
) => {
  const res = await axios.get(`/api/artists/${id}/audios/`);
  const rawTracks = (res.data || []).map(formatLocalTrack).filter(Boolean);
  const tracks = sortTracksByLatestDownload(rawTracks);
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
  const rawTracks = (res.data || []).map(formatLocalTrack).filter(Boolean);
  const tracks = sortTracksByLatestDownload(rawTracks);
  return { data: { tracks } };
};

const fetchSimilarArtists = async (_id: string) => {
  const res = await axios.get('/api/artists/');
  const all = (res.data || []).map(formatLocalArtist);
  return { data: { artists: all.slice(0, 5) } };
};

const fetchArtistPlaylists = async (id: string) => {
  const res = await axios.get(`/api/artists/${id}/playlists/`).catch(() => ({ data: [] }));
  const playlists = (res.data || []).map(formatLocalPlaylist).filter(Boolean);
  return { data: playlists };
};

export const artistService = {
  fetchArtist,
  fetchArtists,
  fetchArtistAlbums,
  fetchArtistTopTracks,
  fetchSimilarArtists,
  fetchArtistPlaylists,
};


