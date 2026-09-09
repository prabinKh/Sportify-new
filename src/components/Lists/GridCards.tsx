import { PlayCircle } from './PlayCircle';
import { TrackActionsWrapper } from '../Actions/TrackActions';
import { AlbumActionsWrapper } from '../Actions/AlbumActions';
import { ArtistActionsWrapper } from '../Actions/ArtistActions';
import { PlayistActionsWrapper } from '../Actions/PlaylistActions';
import { MenuDots } from '../Icons';

// Interfaces
import type { Track } from '../../interfaces/track';
import type { Album } from '../../interfaces/albums';
import type { Artist } from '../../interfaces/artist';
import type { Playlist } from '../../interfaces/playlists';

// Utils
import { useTranslation } from 'react-i18next';

// Services
import { playerService } from '../../services/player';

// Redux
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/store';

// Constants
import { PLAYLIST_DEFAULT_IMAGE, ARTISTS_DEFAULT_IMAGE } from '../../constants/spotify';
import { uiActions } from '../../store/slices/ui';
import { useCallback } from 'react';

const Card = ({
  uri,
  title,
  image,
  rounded,
  description,
  onClick,
  context,
}: {
  uri: string;
  image: string;
  title: string;
  rounded?: boolean;
  description: string;
  onClick: () => void;
  context: { context_uri?: string; uris?: string[] };
}) => {
  const paused = useAppSelector((state) => (state.spotify.state ? state.spotify.state.paused : true));
  const contextUri = useAppSelector((state) => state.spotify.state?.context.uri);
  const isCurrent = contextUri === uri;

  return (
    <div
      onClick={onClick}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}
      className='playlist-card relative rounded-lg overflow-hidden hover:bg-spotify-gray-lightest transition'
    >
      <div
        style={{ position: 'relative', width: '100%', padding: '12px' }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: rounded ? '50%' : '6px',
            overflow: 'hidden',
            backgroundColor: '#282828',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <img
            src={image || PLAYLIST_DEFAULT_IMAGE}
            alt={title}
            className={rounded ? 'rounded' : ''}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              borderRadius: rounded ? '50%' : '6px',
            }}
          />
        </div>
        <div
          className={`circle-play-div transition translate-y-1/4 ${
            isCurrent && !paused ? 'active' : ''
          }`}
          style={{
            position: 'absolute',
            right: 20,
            bottom: 20,
            zIndex: 2,
          }}
        >
          <PlayCircle image={image} isCurrent={isCurrent} context={context} />
        </div>
      </div>
      <div className='playlist-card-info' style={{ padding: '0 12px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3
          className='text-md font-semibold text-white'
          style={{
            margin: '0 0 4px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.95rem',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            fontSize: '0.8125rem',
            color: '#b3b3b3',
            lineHeight: 1.35,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

export const ArtistCard = ({
  item,
  onClick,
  getDescription,
}: {
  item: Artist;
  onClick?: () => void;
  getDescription?: (item: Artist) => string;
}) => {
  const navigate = useNavigate();
  const [t] = useTranslation(['artist']);

  const title = item.name;
  const description = getDescription ? getDescription(item) : t('Artist');
  const imageUrl =
    (item.images && item.images.length && item.images[0]?.url) ||
    (item as any)?.image ||
    ARTISTS_DEFAULT_IMAGE;

  return (
    <ArtistActionsWrapper artist={item} trigger={['contextMenu']}>
      <div onClick={onClick}>
        <Card
          rounded
          title={title}
          uri={item.uri}
          description={description}
          image={imageUrl}
          context={{ context_uri: item.uri }}
          onClick={() => navigate(`/artist/${item.id}`)}
        />
      </div>
    </ArtistActionsWrapper>
  );
};

export const AlbumCard = ({
  item,
  onClick,
  getDescription,
}: {
  item: Album;
  onClick?: () => void;
  getDescription?: (playlist: Album) => string;
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const onNavigate = useCallback(() => {
    if (!user) {
      return dispatch(uiActions.openLoginModal(item.images[0].url));
    }
    navigate(`/album/${item.id}`);
  }, [user, navigate, item.id, item.images, dispatch]);

  const title = item.name;

  const description = getDescription
    ? getDescription(item)
    : item.artists
        .slice(0, 3)
        .map((artist) => artist.name)
        .join(', ');

  return (
    <AlbumActionsWrapper album={item} trigger={['contextMenu']}>
      <div onClick={onClick}>
        <Card
          title={title}
          uri={item.uri}
          onClick={onNavigate}
          description={description}
          image={item.images[0]?.url}
          context={{ context_uri: item.uri }}
        />
      </div>
    </AlbumActionsWrapper>
  );
};

export const PlaylistCard = ({
  item,
  onClick,
  getDescription,
}: {
  item: Playlist;
  onClick?: () => void;
  getDescription?: (playlist: Playlist) => string;
}) => {
  const navigate = useNavigate();
  const [t] = useTranslation(['playlist']);

  const title = item.name;
  // Feb 2026 renamed the playlist track-count field `tracks` → `items`; fall back so we never
  // render "undefined songs" regardless of which endpoint the playlist came from.
  const trackTotal = (item as any).tracks?.total ?? (item as any).items?.total;
  const description = getDescription
    ? getDescription(item)
    : trackTotal === undefined
      ? ''
      : trackTotal + ' ' + t(trackTotal === 1 ? 'song' : 'songs');

  return (
    <PlayistActionsWrapper playlist={item} trigger={['contextMenu']}>
      <div onClick={onClick} style={{ position: 'relative' }}>
        <Card
          title={title}
          uri={item.uri}
          description={description}
          context={{ context_uri: item.uri }}
          onClick={() => navigate(`/playlist/${item.id}`)}
          image={item.images && item.images.length ? item.images[0].url : PLAYLIST_DEFAULT_IMAGE}
        />
        <PlayistActionsWrapper playlist={item} trigger={['click']}>
          <button
            aria-label='Playlist options'
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 5,
              background: 'rgba(0, 0, 0, 0.7)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <MenuDots />
          </button>
        </PlayistActionsWrapper>
      </div>
    </PlayistActionsWrapper>
  );
};

export const TrackCard = ({
  item,
  getDescription,
  onClick,
}: {
  item: Track;
  onClick?: () => void;
  getDescription?: (track: Track) => string;
}) => {
  const navigate = useNavigate();
  const description = getDescription ? getDescription(item) : item.album?.name || 'Track';

  const handleCardClick = () => {
    if (onClick) onClick();
    playerService.startPlayback({ uris: [item.uri] }).catch(() => {});
    const trId = item.id || item.uri.split(':').pop();
    navigate(`/track/${trId}`);
  };

  return (
    <TrackActionsWrapper track={item} trigger={['contextMenu']}>
      <Card
        uri={item.uri}
        title={item.name}
        description={description}
        context={{ uris: [item.uri] }}
        image={item.album?.images[0]?.url}
        onClick={handleCardClick}
      />
    </TrackActionsWrapper>
  );
};
