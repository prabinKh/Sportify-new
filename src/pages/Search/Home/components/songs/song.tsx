import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import SongView, { SongViewComponents } from '../../../../../components/SongsTable/songView';

// Redux
import { searchActions } from '../../../../../store/slices/search';
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import { playerService } from '../../../../../services/player';

// Interface
import type { TrackWithSave } from '../../../../../interfaces/track';

interface SongProps {
  index: number;
  song: TrackWithSave;
}

export const Song = (props: SongProps) => {
  const { song } = props;
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const songs = useAppSelector((state) => state.search.songs);

  const toggleLike = useCallback(() => {
    dispatch(searchActions.setSavedStateForTrack({ id: song.id, saved: !song.saved }));
  }, [dispatch, song.saved, song.id]);

  const uris = useMemo(() => {
    const index = songs.findIndex((r) => r.uri === song.uri);
    return songs.slice(index).map((r) => r.uri);
  }, [songs, song.uri]);

  const handleRowClick = useCallback(() => {
    playerService.startPlayback({ track: song, uris });
    const artistId = song.artists?.[0]?.id;
    if (artistId) {
      navigate(`/artist/${artistId}`);
    } else if (song.album?.id) {
      navigate(`/album/${song.album.id}`);
    }
  }, [song, uris, navigate]);

  return (
    <SongView
      activable
      view='LIST'
      song={song}
      size='small'
      context={{ uris }}
      saved={song.saved}
      onToggleLike={toggleLike}
      onRowClick={handleRowClick}
      fields={[
        SongViewComponents.ClickeableCover,
        SongViewComponents.Title,
        (props) => <SongViewComponents.AddToLiked {...props} onLikeRefresh={toggleLike} />,
        SongViewComponents.Time,
        SongViewComponents.Actions,
      ]}
    />
  );
};

export default Song;
