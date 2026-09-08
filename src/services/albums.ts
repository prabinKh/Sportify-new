import axios from '../axios';
import { formatLocalTrack } from '../utils';

const fetchNewRelases = async (_params: any = {}) => {
  try {
    const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    const tracks = (res.data || []).map(formatLocalTrack).filter(Boolean);
    const seen = new Set<string>();
    const albums: any[] = [];
    for (const t of tracks) {
      const albumId = String(t.album?.id || t.id);
      if (!seen.has(albumId)) {
        seen.add(albumId);
        albums.push({
          id: albumId,
          type: 'album',
          uri: `spotify:album:${albumId}`,
          name: t.name || t.album?.name || 'Single',
          album_type: 'single',
          images: t.album?.images?.length
            ? t.album.images
            : [{ url: 'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4', height: 300, width: 300 }],
          artists: t.artists || [{ id: '1', name: 'YouTube Artist', type: 'artist', uri: 'spotify:artist:1' }],
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
    const tracks = (res.data || []).map(formatLocalTrack).filter(Boolean);
    const track = tracks.find((t: any) => String(t.album?.id) === String(id) || String(t.id) === String(id)) || tracks[0];
    const albumName = track?.album?.name || (track ? track.name : `Album ${id}`);
    const images = track?.album?.images?.length
      ? track.album.images
      : [{ url: 'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4', height: 300, width: 300 }];
    const artists = track?.artists?.length ? track.artists : [{ id: '1', name: 'YouTube Artist', type: 'artist', uri: 'spotify:artist:1' }];
    const matchingTracks = tracks.filter((t: any) => String(t.album?.id) === String(id) || String(t.id) === String(id));
    const albumTracks = matchingTracks.length > 0 ? matchingTracks : (track ? [track] : []);

    return {
      data: {
        id: id,
        type: 'album',
        uri: `spotify:album:${id}`,
        name: albumName,
        images: images,
        artists: artists,
        tracks: { items: albumTracks, total: albumTracks.length },
      },
    };
  } catch (_e) {
    return {
      data: {
        id: id,
        type: 'album',
        uri: `spotify:album:${id}`,
        name: `Album ${id}`,
        images: [{ url: 'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4', height: 300, width: 300 }],
        artists: [{ id: '1', name: 'YouTube Artist', type: 'artist', uri: 'spotify:artist:1' }],
        tracks: { items: [], total: 0 },
      },
    };
  }
};

const fetchAlbums = async (ids: string[]) => {
  const responses = await Promise.all(ids.map((id) => fetchAlbum(id)));
  return { data: { albums: responses.map((r) => r.data) } };
};

const fetchAlbumTracks = async (id: string, _params: any = {}) => {
  try {
    const res = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
    const all = (res.data || []).map(formatLocalTrack).filter(Boolean);
    const filtered = all.filter((t: any) => String(t.album?.id) === String(id) || String(t.id) === String(id));
    const items = filtered.length > 0 ? filtered : all;
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


