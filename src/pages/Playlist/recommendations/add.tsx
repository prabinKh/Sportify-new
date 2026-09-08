import { FC, memo } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

// Interfaces
import type { Track } from '../../../interfaces/track';

// Services
import { playlistService } from '../../../services/playlists';

// Redux
import { playlistActions } from '../../../store/slices/playlist';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { yourLibraryActions } from '../../../store/slices/yourLibrary';
import { api } from '../../../store/api';

export const AddRecommendation: FC<{ song: Track }> = memo(({ song }) => {
  const dispatch = useAppDispatch();
  const [t] = useTranslation(['playlist']);
  const playlist = useAppSelector((state) => state.playlist.playlist);
  const tracks = useAppSelector((state) => state.playlist.tracks);

  const isAlreadyAdded = tracks.some(
    (item) => String(item.track?.id) === String(song.id) || item.track?.uri === song.uri
  );

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playlist) return;
    playlistService
      .addPlaylistItems(playlist.id, [song.uri || `spotify:track:${song.id}`], playlist.snapshot_id)
      .then(() => {
        message.success(t('Added to playlist') || 'Added to playlist');
        dispatch(yourLibraryActions.fetchMyPlaylists());
        dispatch(playlistActions.refreshPlaylist(playlist.id));
        dispatch(playlistActions.refreshTracks(playlist.id));
        dispatch(playlistActions.removeTrackFromRecommendations({ id: song.id }));
        dispatch(api.util.invalidateTags([{ type: 'Playlist', id: playlist.id }, 'MyPlaylists']));
      })
      .catch((err) => {
        message.error('Could not add track to playlist');
        console.error(err);
      });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playlist) return;
    const trackId = String(song.id || song.uri);
    playlistService
      .removePlaylistItems(playlist.id, [song.uri || `spotify:track:${song.id}`], playlist.snapshot_id)
      .then(() => {
        message.success(t('Removed from playlist') || 'Removed from playlist');
        dispatch(playlistActions.removeTrack({ id: trackId }));
        dispatch(yourLibraryActions.fetchMyPlaylists());
        dispatch(playlistActions.refreshPlaylist(playlist.id));
        dispatch(playlistActions.refreshTracks(playlist.id));
        dispatch(api.util.invalidateTags([{ type: 'Playlist', id: playlist.id }, 'MyPlaylists']));
      })
      .catch((err) => {
        message.error('Could not remove track from playlist');
        console.error(err);
      });
  };

  if (isAlreadyAdded) {
    return (
      <button
        onClick={handleRemove}
        className='transparent-button playlist-remove-btn'
        title='Remove from this playlist'
      >
        <span className='added-text'>✓ {t('Added') || 'Added'}</span>
        <span className='remove-text'>✕ {t('Remove') || 'Remove'}</span>
      </button>
    );
  }

  return (
    <button onClick={handleAdd} className='transparent-button'>
      {t('Add') || 'Add'}
    </button>
  );
});

