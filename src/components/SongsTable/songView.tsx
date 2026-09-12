import { FC, useCallback, useMemo, useState, useEffect } from 'react';
import { Tooltip } from 'antd';
import ReactTimeAgo from 'react-time-ago';
import { DownloadIcon, MenuIcon, Pause, Play } from '../Icons';
import { TrackActionsWrapper } from '../Actions/TrackActions';
import { downloadTrackAudio } from '../../utils/downloadAudio';

// Utils
import { msToTime } from '../../utils';
import { useTranslation } from 'react-i18next';

// Redux
import { useAppDispatch, useAppSelector } from '../../store/store';

// Services
import { Link, useNavigate } from 'react-router-dom';
import { playerService } from '../../services/player';
import { ArtistActionsWrapper } from '../Actions/ArtistActions';
import { AddSongToLibraryButton } from '../Actions/AddSongToLibrary';

// Interfaces
import type { Track } from '../../interfaces/track';
import type { Playlist } from '../../interfaces/playlists';
import type { Album as AlbumType } from '../../interfaces/albums';
import { spotifyActions } from '../../store/slices/spotify';
import useIsMobile from '../../utils/isMobile';
import { EQUILISER_IMAGE } from '../../constants/spotify';
import { Artist } from '../../interfaces/artist';
import { uiActions } from '../../store/slices/ui';

interface DefaultProps {
  song: Track;
  index?: number;
  saved?: boolean;
  canEdit?: boolean;
  addedAt?: string;
  activable?: boolean;
  size?: 'small' | 'normal';
  album?: AlbumType | null;
  playlist?: Playlist | null;
  artist?: Artist | null;
  onToggleLike?: () => void;

  view: 'LIST' | 'COMPACT';
  context: {
    context_uri?: string;
    uris?: string[];
    offset?: {
      position: number;
    };
  };
}

interface ComponentProps extends DefaultProps {
  isList: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay?: () => void;
}

interface SongViewProps extends DefaultProps {
  fields: ((props: ComponentProps) => React.ReactElement | null)[];
}

const getArtists = (artists: Track['artists']) => {
  const safeArtists = (artists || []).slice(0, 3);
  return safeArtists.map((a, i) => (
    <span key={a.id}>
      <ArtistActionsWrapper artist={a} trigger={['contextMenu']}>
        <Link key={a.id} to={`/artist/${a.id}`} style={{ cursor: 'pointer' }}>
          {a.name}
        </Link>
      </ArtistActionsWrapper>
      {i < safeArtists.length - 1 ? ', ' : ''}
    </span>
  ));
};

const ClickeableCover = (props: ComponentProps) => {
  const { song, onPlay, isCurrent, isPlaying } = props;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) onPlay();
  };

  const button = (
    <button className='image-button' onClick={handlePlayClick}>
      {isPlaying && isCurrent ? <Pause /> : <Play />}
    </button>
  );

  const imageUrl = (song?.album?.images || [])[0]?.url;
  if (!imageUrl) return null;

  return (
    <div className={`image p-2 h-full items-center`}>
      <div style={{ position: 'relative' }}>
        <div>
          <img
            src={imageUrl}
            alt={song.album?.name || song.name}
            className='rounded-md'
            style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }}
          />
        </div>
        {button}
      </div>
    </div>
  );
};


const TitleWithCover = (props: ComponentProps) => {
  const { song, isList, isCurrent } = props;
  return (
    <div
      className='flex flex-col'
      style={{
        flex: 8,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 0,
          overflow: 'hidden',
          gap: 12,
        }}
      >
        <Cover {...props} />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
            overflow: 'hidden',
            flex: 1,
          }}
        >
          <div className='flex flex-row items-center' style={{ minWidth: 0, overflow: 'hidden' }}>
            <p
              className={`title text-left ${isCurrent ? 'active' : ''}`}
              style={{
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.9375rem',
                fontWeight: 500,
              }}
            >
              <span>{song.name}</span>{' '}
              {song.explicit && !isList ? <span className='explicit'>E</span> : null}
            </p>
          </div>

          {isList ? (
            <div
              className='text-left artist'
              style={{
                fontSize: '0.8125rem',
                color: '#b3b3b3',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {song.explicit ? <span className='explicit'>E</span> : null}
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getArtists(song.artists)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const Title = (props: ComponentProps) => {
  const { song, isList, isCurrent } = props;

  return (
    <div
      className='flex flex-col'
      style={{
        flex: 8,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 0,
          overflow: 'hidden',
          gap: 12,
        }}
      >
        <Cover {...props} />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
            overflow: 'hidden',
            flex: 1,
          }}
        >
          <div className='flex flex-row items-center' style={{ minWidth: 0, overflow: 'hidden' }}>
            <p
              className={`title text-left ${isCurrent ? 'active' : ''}`}
              style={{
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.9375rem',
                fontWeight: 500,
              }}
            >
              <span>{song.name}</span>{' '}
              {song.explicit && !isList ? <span className='explicit'>E</span> : null}
            </p>
          </div>

          {isList ? (
            <div
              className='text-left artist'
              style={{
                fontSize: '0.8125rem',
                color: '#b3b3b3',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {song.explicit ? <span className='explicit'>E</span> : null}
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getArtists(song.artists)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const Cover = ({ song, album, isList }: ComponentProps) => {
  if (!isList) return null;

  const imageUrl = (song?.album?.images || album?.images || [])[0]?.url;
  if (!imageUrl) return null;

  return (
    <img
      alt='song cover'
      src={imageUrl}
      className='w-10 h-10 rounded-md flex-shrink-0'
      style={{
        width: 40,
        height: 40,
        objectFit: 'cover',
        borderRadius: 4,
        flexShrink: 0,
        display: 'block',
      }}
    />
  );
};

const Artists = ({ song, isList }: ComponentProps) => {
  if (isList) return null;
  return (
    <p className='text-left tablet-hidden' style={{ flex: 5 }}>
      {getArtists(song.artists)}
    </p>
  );
};

const Album = ({ song }: ComponentProps) => {
  return (
    <p className='text-left tablet-hidden' style={{ flex: 5 }}>
      <Link to={`/album/${song.album.id}`}>
        {song.album.name}
      </Link>
    </p>
  );
};

const AddedAt = ({ addedAt, song }: ComponentProps) => {
  const language = useAppSelector((state) => state.language.language);
  const dateValue = addedAt || (song as any)?.downloaded_at;

  let formatted = '';
  if (dateValue) {
    try {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        formatted = d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      formatted = '';
    }
  }

  return (
    <p className='text-left tablet-hidden' style={{ flex: 3, margin: 0, color: '#b3b3b3', fontSize: '0.875rem' }}>
      {formatted || '—'}
    </p>
  );
};

const AddToLiked = ({
  song,
  saved,
  onLikeRefresh,
}: ComponentProps & {
  onLikeRefresh: (id: string) => void;
}) => {
  const dispatch = useAppDispatch();
  const currentSong = useAppSelector((state) => state.spotify.state?.track_window.current_track.id);

  return (
    <p
      className='text-right tablet-hidden'
      style={{ flex: 1, display: 'flex', justifyContent: 'end' }}
    >
      <AddSongToLibraryButton
        size={18}
        id={song.id}
        isSaved={!!saved}
        onToggle={() => {
          if (onLikeRefresh) onLikeRefresh(song.id);
          if (currentSong === song.id) dispatch(spotifyActions.setLiked({ liked: !saved }));
        }}
      />
    </p>
  );
};

const Actions = (props: ComponentProps) => {
  const { song, canEdit, playlist, album, artist, saved, onToggleLike } = props;
  const [t] = useTranslation(['order']);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div
      className='text-right actions'
      style={{
        flex: '0 0 auto',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        marginLeft: 8,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip title={`Download "${song.name}"`}>
        <button
          className='scale desktop-only'
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#b3b3b3',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            e.stopPropagation();
            downloadTrackAudio(song, user, dispatch);
          }}
        >
          <DownloadIcon style={{ height: 16, width: 16 }} />
        </button>
      </Tooltip>
      <TrackActionsWrapper
        track={song}
        album={album}
        artist={artist}
        canEdit={canEdit}
        playlist={playlist}
        saved={onToggleLike ? saved : undefined}
        onSavedToggle={onToggleLike ? onToggleLike : undefined}
        trigger={['click']}
      >
        <div
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 6px',
            borderRadius: '50%',
            color: '#b3b3b3',
          }}
          className='hover:text-white'
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title={`${t('More options for')} ${song.name}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MenuIcon />
            </div>
          </Tooltip>
        </div>
      </TrackActionsWrapper>
    </div>
  );
};

const Time = ({ song }: ComponentProps) => {
  return (
    <div
      className='text-right'
      style={{
        flex: '0 0 auto',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        color: '#b3b3b3',
        fontSize: '0.875rem',
        margin: 0,
        minWidth: 40,
        marginLeft: 8,
      }}
    >
      {msToTime(song.duration_ms)}
    </div>
  );
};

const Index = ({
  index,
  isCurrent,
  isPlaying,
  onClick,
}: {
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onClick: () => void;
}) => {
  return (
    <div style={{ flex: 1 }} className='mobile-hidden'>
      <p className='song-details-index'>
        {isCurrent && isPlaying ? (
          <img alt={'equaliser'} style={{ height: 10, margin: '0 auto' }} src={EQUILISER_IMAGE} />
        ) : (
          <span style={{ margin: '0 auto' }}>{index + 1}</span>
        )}
      </p>
      <button className='song-details-play' onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {isCurrent && isPlaying ? <Pause /> : <Play />}
      </button>
    </div>
  );
};

export const SongView = (props: SongViewProps) => {
  const { size = 'normal' } = props;
  const { view, song, index, context, artist, playlist, canEdit, fields, album } = props;

  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => !!state.auth.user);
  const isPlaying = useAppSelector((state) => (state.spotify.state ? !state.spotify.state.paused : false));
  const currentSong = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track,
    (a, b) => a?.id === b?.id
  );

  const isCurrent = useMemo(
    () => (currentSong ? String(currentSong.id) === String(song.id) || currentSong.uri === song.uri : false),
    [currentSong, song]
  );

  const selectedView = isMobile ? 'LIST' : view;

  const isList = selectedView === 'LIST';

  const onClick = useCallback(() => {
    if (isCurrent && isPlaying) {
      return playerService.pausePlayback();
    }
    if (isCurrent) {
      return playerService.startPlayback();
    }
    return playerService.startPlayback({ track: song, ...context });
  }, [isCurrent, isPlaying, context, song]);

  return (
    <TrackActionsWrapper
      track={song}
      album={album}
      key={song.id}
      artist={artist}
      canEdit={canEdit}
      playlist={playlist}
      trigger={['contextMenu']}
      saved={props.onToggleLike ? props.saved : undefined}
      onSavedToggle={props.onToggleLike ? props.onToggleLike : undefined}
    >
      <div
        onClick={onClick}
        style={{ cursor: 'pointer' }}
        className={`flex flex-col w-full hover:bg-spotify-gray-lightest items-center ${
          size === 'normal' ? 'p-2' : ''
        } rounded-lg ${props.activable ? 'activable-song' : ''}`}
      >
        <div className='song-details flex flex-row items-center w-full'>
          <div className='flex flex-row items-center justify-between w-full'>
            {index !== undefined ? (
              <Index index={index} isCurrent={isCurrent} isPlaying={isPlaying} onClick={onClick} />
            ) : null}
            {fields.map((Field, i) => (
              <Field
                key={i}
                isList={isList}
                onPlay={onClick}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                {...props}
              />
            ))}
          </div>
        </div>
      </div>
    </TrackActionsWrapper>
  );
};

export default SongView;

export const SongViewComponents = {
  Title,
  ClickeableCover,
  TitleWithCover,
  Artists,
  Cover,
  Album,
  AddedAt,
  AddToLiked,
  Actions,
  Time,
};
