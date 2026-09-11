import { message } from 'antd';
import axios from '../axios';
import { uiActions } from '../store/slices/ui';
import type { AppDispatch } from '../store/store';
import type { User } from '../interfaces/user';
import type { Track } from '../interfaces/track';
import type { Playlist } from '../interfaces/playlists';

/**
 * Validates if the user is authenticated (not guest, not undefined).
 * If not authenticated, opens the LoginModal and returns false.
 */
export const validateAuthForDownload = (
  user: User | undefined | null,
  dispatch: AppDispatch,
  artwork?: string
): boolean => {
  if (!user || !user.id || user.id === 'guest') {
    message.warning('Please log in to download audio and playlists.');
    dispatch(
      uiActions.openLoginModal(
        artwork || 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
      )
    );
    return false;
  }
  return true;
};

/**
 * Triggers a native browser file download from a Blob
 */
const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Downloads a single audio track as an MP3 file
 */
export const downloadTrackAudio = async (
  track: Track | Spotify.Track | any,
  user: User | undefined | null,
  dispatch: AppDispatch
): Promise<boolean> => {
  const artwork = track.album?.images?.[0]?.url || (track as any)?.thumbnail;
  if (!validateAuthForDownload(user, dispatch, artwork)) {
    return false;
  }

  const rawId = track.id || track.uri?.split(':').pop();
  if (!rawId) {
    message.error('Invalid track identifier.');
    return false;
  }

  const hide = message.loading(`Downloading "${track.name || 'audio'}"...`, 0);

  try {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    const response = await axios.get(`/api/tracks/${rawId}/download/`, {
      responseType: 'blob',
      headers,
    });

    // Determine filename from header or fallback
    let filename = `${track.name || 'track'}.mp3`;
    const disposition = response.headers?.['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    triggerBlobDownload(response.data, filename);
    hide();
    message.success(`Downloaded "${track.name || filename}"!`);
    return true;
  } catch (err: any) {
    hide();
    if (err?.response?.status === 401) {
      message.error('Session expired. Please log in again to download.');
      dispatch(
        uiActions.openLoginModal(
          artwork || 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
        )
      );
    } else if (err?.response?.status === 404) {
      message.error('Audio file is not available for this track yet.');
    } else {
      message.error('Failed to download audio. Please try again.');
    }
    console.error('Download error:', err);
    return false;
  }
};

/**
 * Downloads all tracks in a playlist as a ZIP bundle
 */
export const downloadPlaylistAudio = async (
  playlist: Playlist | { id: string | number; name?: string; images?: any[] } | any,
  user: User | undefined | null,
  dispatch: AppDispatch
): Promise<boolean> => {
  const artwork = playlist.images?.[0]?.url;
  if (!validateAuthForDownload(user, dispatch, artwork)) {
    return false;
  }

  const playlistId = playlist.id;
  if (!playlistId) {
    message.error('Invalid playlist.');
    return false;
  }

  const playlistName = playlist.name || 'Playlist';
  const hide = message.loading(`Packaging "${playlistName}" as ZIP...`, 0);

  try {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    const response = await axios.get(`/api/playlists/${playlistId}/download/`, {
      responseType: 'blob',
      headers,
    });

    let filename = `${playlistName}.zip`;
    const disposition = response.headers?.['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    triggerBlobDownload(response.data, filename);
    hide();
    message.success(`Downloaded playlist "${playlistName}"!`);
    return true;
  } catch (err: any) {
    hide();
    if (err?.response?.status === 401) {
      message.error('Session expired. Please log in again to download.');
      dispatch(
        uiActions.openLoginModal(
          artwork || 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
        )
      );
    } else if (err?.response?.status === 404) {
      message.error('No downloadable audio tracks found in this playlist.');
    } else if (err?.response?.status === 403) {
      message.error('You do not have permission to download this private playlist.');
    } else {
      message.error('Failed to download playlist ZIP. Please try again.');
    }
    console.error('Playlist download error:', err);
    return false;
  }
};
