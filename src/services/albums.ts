import axios from '../axios';
import { formatLocalTrack } from '../utils';

const fetchNewRelases = async (_params: any = {}) => {
  try {
    const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    const tracks = (res.data || []).map(formatLocalTrack);
    const seen = new Set<string>();
    const albums: any[] = [];
    for (const t of tracks) {
      if (t.album && !seen.has(t.album.id)) {
        seen.add(t.album.id);
        albums.push({
          ...t.album,
          album_type: 'single',
          release_date: t.downloaded_at || '2026',
          total_tracks: 1,
        });
      }
    }
    return { data: { albums: { items: albums, total: albums.length } } };
  } catch (_e) {
    return { data: { albums: { items: [], total: 0 } } };
  }
};

const fetchAlbum = async (id: string) => {
  try {
    const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    const tracks = (res.data || []).map(formatLocalTrack);
    const track = tracks.find((t: any) => String(t.album?.id) === String(id)) || tracks[0];
    const albumName = track?.album?.name || (track ? track.name : `Album ${id}`);
    const images = track?.album?.images?.length
      ? track.album.images
      : track?.images?.length
      ? track.images
      : [{ url: '' }];
    const artists = track?.artists?.length ? track.artists : [{ id: '1', name: 'Artist' }];
    return {
      data: {
        id: id,
        uri: `spotify:album:${id}`,
        name: albumName,
        images: images,
        artists: artists,
        tracks: { items: tracks, total: tracks.length },
      },
    };
  } catch (_e) {
    return {
      data: {
        id: id,
        uri: `spotify:album:${id}`,
        name: `Album ${id}`,
        images: [{ url: '' }],
        artists: [{ id: '1', name: 'Artist' }],
        tracks: { items: [], total: 0 },
      },
    };
  }
};

const fetchAlbums = async (ids: string[]) => {
  const responses = await Promise.all(ids.map((id) => fetchAlbum(id)));
  return { data: { albums: responses.map((r) => r.data) } };
};

const fetchAlbumTracks = async (_id: string, _params: any = {}) => {
  try {
    const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    const items = (res.data || []).map(formatLocalTrack);
    return { data: { items, total: items.length } };
  } catch (_e) {
    return { data: { items: [], total: 0 } };
  }
};

const fetchSavedAlbums = async (_params: any = {}) => {
  return { data: { items: [], total: 0 } };
};

const saveAlbums = async (_ids: string[]) => {
  return { data: {} };
};

const deleteAlbums = async (_ids: string[]) => {
  return { data: {} };
};

export const albumsService = {
  fetchAlbum,
  fetchAlbums,
  fetchNewRelases,
  fetchSavedAlbums,
  fetchAlbumTracks,
  saveAlbums,
  deleteAlbums,
};


