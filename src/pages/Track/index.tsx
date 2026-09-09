import { FC, memo, RefObject, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import tinycolor from 'tinycolor2';
import axios from '../../axios';
import { formatLocalTrack, secondsToTime } from '../../utils';
import { getImageAnalysis2 } from '../../utils/imageAnyliser';
import { playerService } from '../../services/player';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { AddSongToLibraryButton } from '../../components/Actions/AddSongToLibrary';
import { spotifyActions } from '../../store/slices/spotify';
import { Play, Pause, SkipBack, SkipNext, Heart, AddedToLibrary, AddToLibrary } from '../../components/Icons';
import type { Track } from '../../interfaces/track';
import '../../styles/TrackPage.scss';

interface TrackPageProps {
  container?: RefObject<HTMLDivElement | null>;
}

export const TrackPage: FC<TrackPageProps> = memo(() => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [track, setTrack] = useState<Track | null>(null);
  const [color, setColor] = useState<string>('#1db954');
  const [loading, setLoading] = useState<boolean>(true);

  const currentTrackState = useAppSelector((state) => state.spotify.state?.track_window?.current_track);
  const paused = useAppSelector((state) => (state.spotify.state ? state.spotify.state.paused : true));
  const position = useAppSelector((state) => state.spotify.state?.position || 0);
  const duration = useAppSelector((state) => state.spotify.state?.duration || (track ? track.duration_ms : 180000));
  const liked = useAppSelector((state) => state.spotify.liked);

  const isCurrentPlaying = useMemo(() => {
    if (!currentTrackState || !track) return false;
    const curId = currentTrackState.id || currentTrackState.uri.split(':').pop();
    const targetId = track.id || track.uri.split(':').pop();
    return curId === targetId;
  }, [currentTrackState, track]);

  // Load track data by trackId or fallback search
  useEffect(() => {
    if (!trackId) return;

    let isMounted = true;
    setLoading(true);

    const loadTrack = async () => {
      try {
        let rawData: any = null;
        // Try fetching single track endpoint first
        const directRes = await axios.get(`/api/media/${trackId}/`).catch(() => null);
        if (directRes && directRes.data) {
          rawData = directRes.data;
        } else {
          // Fallback to searching track in track list
          const allRes = await axios.get('/api/tracks/').catch(() => ({ data: [] }));
          const matches = (allRes.data || []).filter((t: any) => 
            String(t.id) === trackId || 
            encodeURIComponent(t.title || '') === trackId ||
            t.media_url?.includes(trackId)
          );
          if (matches.length) rawData = matches[0];
          else if (allRes.data && allRes.data.length) rawData = allRes.data[0];
        }

        if (isMounted && rawData) {
          const formatted = formatLocalTrack(rawData);
          setTrack(formatted);

          // Auto-start playback on song page load
          playerService.startPlayback({ uris: [formatted.uri] }).catch(() => {});

          // Extract artwork theme color
          if (formatted.album?.images?.[0]?.url) {
            getImageAnalysis2(formatted.album.images[0].url).then((c) => {
              if (isMounted && c) {
                const dark = tinycolor(c).darken(25).toHexString();
                setColor(dark);
              }
            });
          }
        }
      } catch (err) {
        console.error('Error loading track details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTrack();

    return () => {
      isMounted = false;
    };
  }, [trackId]);

  const handlePlayPause = () => {
    if (!track) return;
    if (isCurrentPlaying && !paused) {
      playerService.pausePlayback();
    } else {
      playerService.startPlayback({ uris: [track.uri] });
    }
  };

  const handleToggleLike = () => {
    dispatch(spotifyActions.setLiked({ liked: !liked }));
  };

  if (loading || !track) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#b3b3b3' }}>
        <h2>Loading song details...</h2>
      </div>
    );
  }

  const isPlaying = isCurrentPlaying && !paused;

  return (
    <div
      className='track-page-container'
      style={{
        background: `linear-gradient(180deg, ${color} 0%, #121212 100%)`,
        // @ts-ignore
        '--accent-color': color,
      }}
    >
      <div className='track-page-content'>
        {/* Cover Artwork & Pulsing Aura */}
        <div className={`artwork-container ${isPlaying ? 'is-playing' : ''}`}>
          <div className='artwork-glow'></div>
          <img
            src={track.album?.images[0]?.url}
            alt={track.name}
            className='track-cover-img'
          />
          {isPlaying && (
            <div className='playing-badge'>
              <span>♪ Playing Now</span>
            </div>
          )}
        </div>

        {/* Audio Equalizer Spectrum Bar Visualizer */}
        <div className='visualizer-container'>
          {Array.from({ length: 18 }).map((_, idx) => (
            <div
              key={idx}
              className={`eq-bar ${isPlaying ? 'playing' : ''}`}
              style={{
                animationDelay: `${(idx * 0.13) % 1.2}s`,
                animationDuration: `${0.8 + (idx % 5) * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* Track Title & Artist Metadata */}
        <div className='track-info-header'>
          <h1 className='track-title'>{track.name}</h1>
          <p className='artist-name'>
            By{' '}
            <Link to={`/artist/${track.artists[0]?.id}`}>
              {track.artists[0]?.name || 'Artist'}
            </Link>
          </p>
        </div>

        {/* Playback Control Box */}
        <div className='track-controls-card'>
          {/* Progress Bar & Seek */}
          <div className='progress-section'>
            <div className='progress-bar-bg'>
              <div
                className='progress-bar-fill'
                style={{
                  width: `${(position / (duration || 1)) * 100}%`,
                }}
              />
            </div>
            <div className='time-labels'>
              <span>{secondsToTime(Math.floor(position / 1000))}</span>
              <span>{secondsToTime(Math.floor(duration / 1000))}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='action-buttons'>
            <button
              className='control-btn'
              aria-label='Toggle Favorite'
              onClick={handleToggleLike}
            >
              {liked ? <AddedToLibrary fill='#1ed760' /> : <AddToLibrary />}
            </button>

            <button
              className='control-btn'
              aria-label='Previous Track'
              onClick={() => playerService.previousTrack()}
            >
              <SkipBack />
            </button>

            <button
              className='control-btn play-pause-big'
              aria-label='Play / Pause'
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause /> : <Play />}
            </button>

            <button
              className='control-btn'
              aria-label='Next Track'
              onClick={() => playerService.nextTrack()}
            >
              <SkipNext />
            </button>

            <AddSongToLibraryButton
              size={18}
              id={track.id}
              isSaved={liked}
              onToggle={handleToggleLike}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default TrackPage;
