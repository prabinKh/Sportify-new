import { FC, memo, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tinycolor from 'tinycolor2';
import axios from '../../axios';
import { formatLocalTrack, secondsToTime } from '../../utils';
import { getImageAnalysis2 } from '../../utils/imageAnyliser';
import { playerService } from '../../services/player';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { Play, Pause, SkipBack, SkipNext, MicrophoneIcon, CloseIcon } from '../../components/Icons';
import type { Track } from '../../interfaces/track';
import '../../styles/KaraokePage.scss';

interface KaraokePageProps {
  container?: RefObject<HTMLDivElement | null>;
}

interface WordTiming {
  word: string;
  startSec: number;
  endSec: number;
}

interface LyricLine {
  id: number;
  timeSec: number;
  durationSec: number;
  text: string;
  words: WordTiming[];
}

const SlidersIcon = () => (
  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <line x1='4' y1='21' x2='4' y2='14'></line>
    <line x1='4' y1='10' x2='4' y2='3'></line>
    <line x1='12' y1='21' x2='12' y2='12'></line>
    <line x1='12' y1='8' x2='12' y2='3'></line>
    <line x1='20' y1='21' x2='20' y2='16'></line>
    <line x1='20' y1='12' x2='20' y2='3'></line>
    <line x1='1' y1='14' x2='7' y2='14'></line>
    <line x1='9' y1='8' x2='15' y2='8'></line>
    <line x1='17' y1='16' x2='23' y2='16'></line>
  </svg>
);

const FullscreenIcon = () => (
  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3'></path>
  </svg>
);

const QueueIcon = () => (
  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <line x1='8' y1='6' x2='21' y2='6'></line>
    <line x1='8' y1='12' x2='21' y2='12'></line>
    <line x1='8' y1='18' x2='21' y2='18'></line>
    <line x1='3' y1='6' x2='3.01' y2='6'></line>
    <line x1='3' y1='12' x2='3.01' y2='12'></line>
    <line x1='3' y1='18' x2='3.01' y2='18'></line>
  </svg>
);



export const KaraokePage: FC<KaraokePageProps> = memo(() => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();

  const [track, setTrack] = useState<Track | null>(null);
  const [color, setColor] = useState<string>('#1db954');
  const [loading, setLoading] = useState<boolean>(true);
  const lyricsBoxRef = useRef<HTMLDivElement>(null);

  // Personalize Popover Drawer State
  const [showPersonalize, setShowPersonalize] = useState<boolean>(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const [mode, setMode] = useState<'karaoke' | 'battle'>('karaoke');
  const [singerName, setSingerName] = useState<string>('Singer');
  const [adjustVolumes, setAdjustVolumes] = useState<boolean>(true);
  const [leadVocal, setLeadVocal] = useState<number>(100);
  const [backingVocals, setBackingVocals] = useState<number>(75);
  const [instrumental, setInstrumental] = useState<number>(100);
  const [keySemitones, setKeySemitones] = useState<number>(0);
  const [tempoPercent, setTempoPercent] = useState<number>(0);

  // Quick Stem Audio Preset State
  const [audioPreset, setAudioPreset] = useState<'full' | 'vocal_only' | 'beat_only' | 'vocal_mute'>('full');

  // Customization & Mic FX
  const [theme, setTheme] = useState<'ambient' | 'neon' | 'cyberpunk' | 'space' | 'synthwave'>('ambient');
  const [lyricColor, setLyricColor] = useState<'green' | 'gold' | 'cyan' | 'pink'>('green');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'giant'>('normal');
  const [micEnabled, setMicEnabled] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(80);
  const [reverbPreset, setReverbPreset] = useState<'off' | 'room' | 'stage' | 'concert' | 'arena'>('stage');
  const [echoDelay, setEchoDelay] = useState<number>(120);
  const [autoTune, setAutoTune] = useState<'off' | 'mild' | 'strong'>('off');
  const [lyricSyncOffset, setLyricSyncOffset] = useState<number>(0);
  const [personalizeTab, setPersonalizeTab] = useState<'all' | 'audio' | 'pitch' | 'mic' | 'visuals'>('all');

  // Battle Mode Scoring State
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(1);
  const [feedback, setFeedback] = useState<string>('GET READY!');
  const [userPitchPct, setUserPitchPct] = useState<number>(50);

  const currentTrackState = useAppSelector((state) => state.spotify.state?.track_window?.current_track);
  const paused = useAppSelector((state) => (state.spotify.state ? state.spotify.state.paused : true));
  const position = useAppSelector((state) => state.spotify.state?.position || 0);
  const duration = useAppSelector((state) => state.spotify.state?.duration || (track ? track.duration_ms : 180000));
  const currentSec = Math.max(0, Math.floor(position / 1000) + Math.floor(lyricSyncOffset / 1000));

  const isCurrentPlaying = useMemo(() => {
    if (!currentTrackState || !track) return false;
    const curId = currentTrackState.id || currentTrackState.uri.split(':').pop();
    const targetId = track.id || track.uri.split(':').pop();
    return curId === targetId;
  }, [currentTrackState, track]);

  // Load track data
  useEffect(() => {
    if (!trackId) return;

    let isMounted = true;
    setLoading(true);

    const loadTrack = async () => {
      try {
        let rawData: any = null;
        const directRes = await axios.get(`/api/media/${trackId}/`).catch(() => null);
        if (directRes && directRes.data) {
          rawData = directRes.data;
        } else {
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

          // Auto-start playback on Karaoke page load
          playerService.startPlayback({ uris: [formatted.uri] }).catch(() => {});

          if (formatted.album?.images?.[0]?.url) {
            getImageAnalysis2(formatted.album.images[0].url).then((c) => {
              if (isMounted && c) {
                const dark = tinycolor(c).darken(20).toHexString();
                setColor(dark);
              }
            });
          }
        }
      } catch (err) {
        console.error('Error loading Karaoke track:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTrack();

    return () => {
      isMounted = false;
    };
  }, [trackId]);

  // Synchronized Word-by-Word Karaoke Lyrics Timing Engine
  const sampleLyrics: LyricLine[] = useMemo(() => {
    if (!track) return [];

    const title = track.name || 'Song';
    const artist = track.artists[0]?.name || 'Artist';

    const rawSentences = [
      `If I'm alive and well`,
      `will you be there`,
      `will you still call me Superman`,
      `🎵 (Intro - ${title})`,
      `Yeah feel the beat and sing along`,
      `To ${title} by ${artist}`,
      `Every single line hit the soul so clear`,
      `Rhythm bouncing in the atmosphere`,
      `Ooh yeah let the melody take control`,
      `Singing aloud deep in the soul`,
      `Chorus: ${title}`,
      `We got the light we got the sound`,
      `Music turn up echo all around`,
      `Verse 2: Feel the vibration`,
      `Every single word a pure sensation`,
      `Higher and higher let it rise`,
      `Look right ahead reach for the skies`,
      `Chorus: ${title} - ${artist}`,
      `Never stop the music play it again`,
      `🎵 (Outro - Fade out)`,
    ];

    const totalDurationSec = Math.max(60, Math.floor((duration || 180000) / 1000));
    const lineInterval = totalDurationSec / rawSentences.length;

    return rawSentences.map((sentence, lineIdx) => {
      const lineStartSec = lineIdx * lineInterval;
      const wordsArr = sentence.split(' ').filter(Boolean);
      const wordDuration = lineInterval / wordsArr.length;

      const wordsTiming: WordTiming[] = wordsArr.map((w, wIdx) => ({
        word: w,
        startSec: lineStartSec + (wIdx * wordDuration),
        endSec: lineStartSec + ((wIdx + 1) * wordDuration),
      }));

      return {
        id: lineIdx,
        timeSec: Math.floor(lineStartSec),
        durationSec: lineInterval,
        text: sentence,
        words: wordsTiming,
      };
    });
  }, [track, duration]);

  // Determine active lyric line index based on current playback position
  const activeLyricIndex = useMemo(() => {
    let activeIdx = 0;
    for (let i = 0; i < sampleLyrics.length; i++) {
      if (currentSec >= sampleLyrics[i].timeSec) {
        activeIdx = i;
      }
    }
    return activeIdx;
  }, [currentSec, sampleLyrics]);

  // Battle Mode Live Scoring Simulation Loop
  useEffect(() => {
    if (mode !== 'battle' || paused) return;

    const interval = setInterval(() => {
      const isSinging = Math.random() > 0.15;
      if (isSinging) {
        const delta = Math.floor(Math.random() * 140) + 80;
        setScore((prev) => prev + delta * combo);
        setUserPitchPct((prev) => Math.max(10, Math.min(90, prev + (Math.random() * 20 - 10))));

        if (delta > 180) {
          setFeedback('PERFECT!');
          setCombo((c) => Math.min(10, c + 1));
        } else if (delta > 120) {
          setFeedback('GREAT!');
        } else {
          setFeedback('GOOD!');
        }
      } else {
        setFeedback('KEEP SINGING!');
        setCombo(1);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [mode, paused, combo]);

  // Enable Microphone Pitch Tracking
  useEffect(() => {
    if (!micEnabled) return;
    let stream: MediaStream | null = null;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
      stream = s;
    }).catch(() => {
      console.warn('Microphone permission denied or unavailable');
      setMicEnabled(false);
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [micEnabled]);

  // Auto-scroll lyrics container to keep active lyric centered
  useEffect(() => {
    if (!lyricsBoxRef.current) return;
    const activeEl = lyricsBoxRef.current.children[activeLyricIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLyricIndex]);

  // Fullscreen Stage Mode Toggle & Dynamic Particle Engine
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const stageParticles = useMemo(() => {
    const symbols = ['🎵', '🎶', '✨', '🎤', '⭐', '💫', '🔥', '💖'];
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      symbol: symbols[i % symbols.length],
      left: `${(i * 3.4 + (i % 3) * 7.5) % 96 + 2}%`,
      animationDuration: `${3.2 + (i % 5) * 1.1}s`,
      animationDelay: `${(i % 7) * 0.3}s`,
      fontSize: `${1.2 + (i % 4) * 0.4}rem`,
    }));
  }, []);

  const equalizerBars = useMemo(() => {
    return Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      height: `${25 + Math.sin(i * 0.8) * 45 + (i % 5) * 8}%`,
      animationDelay: `${(i % 8) * 0.08}s`,
      animationDuration: `${0.35 + (i % 4) * 0.15}s`,
    }));
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleKeyChange = (val: number) => {
    setKeySemitones(val);
    playerService.setKeyShift(val);
  };

  const handleTempoChange = (val: number) => {
    setTempoPercent(val);
    playerService.setTempo(val);
  };

  const handleVocalChange = (lead: number, backing: number, inst: number) => {
    setLeadVocal(lead);
    setBackingVocals(backing);
    setInstrumental(inst);
    playerService.setVocalControl(lead, backing, inst);
  };

  // Handle Quick Audio Stem Presets (Vocal Only / Beat Only / Vocal Mute / Full)
  const applyAudioPreset = (preset: 'full' | 'vocal_only' | 'beat_only' | 'vocal_mute') => {
    setAudioPreset(preset);
    if (preset === 'vocal_only') {
      handleVocalChange(100, 100, 0);
    } else if (preset === 'beat_only') {
      handleVocalChange(0, 0, 100);
    } else if (preset === 'vocal_mute') {
      handleVocalChange(0, 50, 100);
    } else {
      handleVocalChange(100, 100, 100);
    }
    // Fetch and switch to real backend audio stem from Django server
    const targetTrackId = track ? track.id : trackId;
    if (targetTrackId) {
      playerService.playStemMode(targetTrackId, preset);
    }
  };

  const handlePlayPause = () => {
    if (!track) return;
    if (isCurrentPlaying && !paused) {
      playerService.pausePlayback();
    } else {
      playerService.startPlayback({ uris: [track.uri] });
    }
  };

  const isPlaying = isCurrentPlaying && !paused;

  if (loading || !track) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#b3b3b3' }}>
        <h2>Loading Karaoke Mode...</h2>
      </div>
    );
  }

  return (
    <div
      className={`karaoke-page-container theme-${theme} ${isFullscreen ? 'is-fullscreen' : ''}`}
      style={{
        background: theme === 'ambient' ? `radial-gradient(circle at center, ${color} 0%, #0a0a0a 100%)` : undefined,
        // @ts-ignore
        '--accent-color': color,
      }}
    >
      {/* Fullscreen Animated Stage Background & Laser Beams */}
      {isFullscreen && (
        <>
          <div className='stage-spotlights'>
            <div className='beam beam-1' />
            <div className='beam beam-2' />
            <div className='beam beam-3' />
            <div className='beam beam-4' />
          </div>

          <div className='floating-particles'>
            {stageParticles.map((p) => (
              <span
                key={p.id}
                className='particle'
                style={{
                  left: p.left,
                  animationDuration: p.animationDuration,
                  animationDelay: p.animationDelay,
                  fontSize: p.fontSize,
                }}
              >
                {p.symbol}
              </span>
            ))}
          </div>

          <div className='stage-equalizer-bars'>
            {equalizerBars.map((b) => (
              <div
                key={b.id}
                className={`eq-bar ${!paused ? 'playing' : ''}`}
                style={{
                  height: b.height,
                  animationDelay: b.animationDelay,
                  animationDuration: b.animationDuration,
                }}
              />
            ))}
          </div>

          <div className='fullscreen-stage-banner'>
            <span className='star-icon'>✨</span>
            <span className='text'>LIVE STAGE FULLSCREEN MODE</span>
            <span className='star-icon'>✨</span>
          </div>
        </>
      )}
      {/* Header Bar */}
      <div className='karaoke-header'>
        <div className='header-left'>
          <button
            className='back-button'
            aria-label='Back'
            onClick={() => navigate(-1)}
          >
            <CloseIcon />
          </button>

          <div className='karaoke-title-badge'>
            <span className='mic-icon-pulse'><MicrophoneIcon /></span>
            <span>KARAOKE MODE</span>
          </div>
        </div>

        <div className='header-right'>
          <button
            className={`action-btn-pill ${showQueueDrawer ? 'active' : ''}`}
            onClick={() => {
              setShowQueueDrawer(!showQueueDrawer);
              setShowPersonalize(false);
            }}
          >
            <QueueIcon />
            <span>Party Queue</span>
          </button>

          <button
            className={`action-btn-pill ${showPersonalize ? 'active' : ''}`}
            onClick={() => {
              setShowPersonalize(!showPersonalize);
              setShowQueueDrawer(false);
            }}
          >
            <SlidersIcon />
            <span>Personalize</span>
          </button>

          <button
            className='back-button'
            aria-label='Toggle Fullscreen Stage'
            onClick={toggleFullscreen}
          >
            <FullscreenIcon />
          </button>
        </div>
      </div>

      {/* Quick Audio Stem Control Bar (Vocal Only / Beat Only / Vocal Mute / Full) */}
      <div className='quick-stem-bar'>
        <button
          className={`stem-preset-btn ${audioPreset === 'full' ? 'active' : ''}`}
          onClick={() => applyAudioPreset('full')}
        >
          🎵 Full Song
        </button>

        <button
          className={`stem-preset-btn ${audioPreset === 'vocal_only' ? 'active' : ''}`}
          onClick={() => applyAudioPreset('vocal_only')}
        >
          🎙️ Vocal Only (Solo)
        </button>

        <button
          className={`stem-preset-btn ${audioPreset === 'beat_only' ? 'active' : ''}`}
          onClick={() => applyAudioPreset('beat_only')}
        >
          🎸 Beat Only (Instrumental)
        </button>

        <button
          className={`stem-preset-btn ${audioPreset === 'vocal_mute' ? 'active' : ''}`}
          onClick={() => applyAudioPreset('vocal_mute')}
        >
          🎤 Vocal Mute (Karaoke)
        </button>
      </div>

      {/* Battle Mode Score & Pitch Match Banner */}
      {mode === 'battle' && (
        <div className='battle-score-banner'>
          <div className='score-box'>
            <span className='label'>Battle Score</span>
            <span className='points'>{score.toLocaleString()} PTS</span>
          </div>

          <div className='pitch-graph-container'>
            <div className='pitch-bar-bg'>
              <div className='pitch-target-marker' style={{ left: '40%' }}></div>
              <div
                className={`pitch-user-fill ${Math.abs(userPitchPct - 50) < 15 ? 'hit' : ''}`}
                style={{ width: `${userPitchPct}%` }}
              ></div>
            </div>
            <div className='pitch-labels'>
              <span>Pitch Graph</span>
              <span>{Math.abs(userPitchPct - 50) < 15 ? '🎯 PITCH MATCH' : 'SING HIGHER'}</span>
            </div>
          </div>

          <div className='combo-badge'>
            <span className='feedback'>{feedback}</span>
            {combo > 1 && <span className='multiplier'>COMBO x{combo}</span>}
          </div>
        </div>
      )}

      {/* State-of-the-Art Right-Hand Personalize Feature Drawer */}
      {showPersonalize && (
        <div className='personalize-sidebar-drawer'>
          <div className='sidebar-header'>
            <div className='title-area'>
              <div className='icon-badge'><SlidersIcon /></div>
              <div>
                <h3>Personalize Studio</h3>
                <span className='subtitle'>Full Audio, FX & Visual Controls</span>
              </div>
            </div>
            <button className='close-btn' onClick={() => setShowPersonalize(false)} aria-label='Close'>
              <CloseIcon />
            </button>
          </div>

          {/* Feature Category Filter Tabs */}
          <div className='sidebar-tabs'>
            <button
              className={`tab-btn ${personalizeTab === 'all' ? 'active' : ''}`}
              onClick={() => setPersonalizeTab('all')}
            >
              All Features
            </button>
            <button
              className={`tab-btn ${personalizeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setPersonalizeTab('audio')}
            >
              Audio & Stems
            </button>
            <button
              className={`tab-btn ${personalizeTab === 'pitch' ? 'active' : ''}`}
              onClick={() => setPersonalizeTab('pitch')}
            >
              Pitch & Key
            </button>
            <button
              className={`tab-btn ${personalizeTab === 'mic' ? 'active' : ''}`}
              onClick={() => setPersonalizeTab('mic')}
            >
              Mic & FX
            </button>
            <button
              className={`tab-btn ${personalizeTab === 'visuals' ? 'active' : ''}`}
              onClick={() => setPersonalizeTab('visuals')}
            >
              Visuals
            </button>
          </div>

          <div className='sidebar-scroll-content'>
            {/* 1. Singer Profile & Stage Mode */}
            {(personalizeTab === 'all' || personalizeTab === 'audio') && (
              <div className='feature-card'>
                <h4 className='section-title'>🎤 Singer & Stage Mode</h4>
                <div className='mode-cards-grid'>
                  <div
                    className={`mode-card karaoke ${mode === 'karaoke' ? 'selected' : ''}`}
                    onClick={() => setMode('karaoke')}
                  >
                    <div className='mode-label'>STANDARD</div>
                    <div className='mode-title'>Karaoke Stage</div>
                  </div>

                  <div
                    className={`mode-card battle ${mode === 'battle' ? 'selected' : ''}`}
                    onClick={() => setMode('battle')}
                  >
                    <div className='mode-label'>LIVE PITCH</div>
                    <div className='mode-title'>Battle Mode</div>
                  </div>
                </div>

                <div className='field-group' style={{ marginTop: 12 }}>
                  <label>Singer Profile / Display Name</label>
                  <input
                    type='text'
                    className='text-input'
                    value={singerName}
                    onChange={(e) => setSingerName(e.target.value)}
                    placeholder='Singer Name'
                  />
                  <div className='preset-pills'>
                    {['Singer', 'Rockstar', 'Vocal Hero', 'Diva'].map((name) => (
                      <span
                        key={name}
                        className={`pill-item ${singerName === name ? 'active' : ''}`}
                        onClick={() => setSingerName(name)}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Audio Stem Presets & Stem Mixers */}
            {(personalizeTab === 'all' || personalizeTab === 'audio') && (
              <div className='feature-card'>
                <h4 className='section-title'>🎵 Audio Stem Presets</h4>
                <div className='preset-grid'>
                  <button
                    className={`stem-preset-btn ${audioPreset === 'full' ? 'active' : ''}`}
                    onClick={() => applyAudioPreset('full')}
                  >
                    🎵 Full Track
                  </button>
                  <button
                    className={`stem-preset-btn ${audioPreset === 'vocal_only' ? 'active' : ''}`}
                    onClick={() => applyAudioPreset('vocal_only')}
                  >
                    🎙️ Solo Vocal
                  </button>
                  <button
                    className={`stem-preset-btn ${audioPreset === 'beat_only' ? 'active' : ''}`}
                    onClick={() => applyAudioPreset('beat_only')}
                  >
                    🎸 Instrumental
                  </button>
                  <button
                    className={`stem-preset-btn ${audioPreset === 'vocal_mute' ? 'active' : ''}`}
                    onClick={() => applyAudioPreset('vocal_mute')}
                  >
                    🎤 Vocal Mute
                  </button>
                </div>

                <div className='toggle-row' style={{ marginTop: 14 }}>
                  <span className='toggle-label'>Adjust Individual Stem Mix</span>
                  <div
                    className={`toggle-switch ${adjustVolumes ? 'on' : ''}`}
                    onClick={() => setAdjustVolumes(!adjustVolumes)}
                  >
                    <div className='knob'></div>
                  </div>
                </div>

                {adjustVolumes && (
                  <div className='slider-group'>
                    <div className='slider-control-item'>
                      <div className='slider-header'>
                        <span>Lead Vocal</span>
                        <span className='val-badge'>{leadVocal}%</span>
                      </div>
                      <input
                        type='range'
                        min='0'
                        max='100'
                        value={leadVocal}
                        onChange={(e) => handleVocalChange(Number(e.target.value), backingVocals, instrumental)}
                        className='range-slider'
                      />
                    </div>

                    <div className='slider-control-item'>
                      <div className='slider-header'>
                        <span>Backing Vocals</span>
                        <span className='val-badge'>{backingVocals}%</span>
                      </div>
                      <input
                        type='range'
                        min='0'
                        max='100'
                        value={backingVocals}
                        onChange={(e) => handleVocalChange(leadVocal, Number(e.target.value), instrumental)}
                        className='range-slider'
                      />
                    </div>

                    <div className='slider-control-item'>
                      <div className='slider-header'>
                        <span>Instrumental / Beat</span>
                        <span className='val-badge'>{instrumental}%</span>
                      </div>
                      <input
                        type='range'
                        min='0'
                        max='100'
                        value={instrumental}
                        onChange={(e) => handleVocalChange(leadVocal, backingVocals, Number(e.target.value))}
                        className='range-slider'
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Pitch, Key & Tempo Transposition */}
            {(personalizeTab === 'all' || personalizeTab === 'pitch') && (
              <div className='feature-card'>
                <div className='card-header-flex'>
                  <h4 className='section-title'>🎼 Key & Tempo Control</h4>
                  {(keySemitones !== 0 || tempoPercent !== 0 || lyricSyncOffset !== 0) && (
                    <button
                      className='reset-link'
                      onClick={() => {
                        handleKeyChange(0);
                        handleTempoChange(0);
                        setLyricSyncOffset(0);
                      }}
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Key Transposition */}
                <div className='slider-control-item'>
                  <div className='slider-header'>
                    <span>Key Transposition</span>
                    <span className='val-badge'>
                      {keySemitones > 0 ? `+${keySemitones} semitones` : `${keySemitones} semitones`}
                    </span>
                  </div>
                  <input
                    type='range'
                    min='-12'
                    max='12'
                    step='1'
                    value={keySemitones}
                    onChange={(e) => handleKeyChange(Number(e.target.value))}
                    className='range-slider'
                  />
                  <div className='tick-markers'>
                    {[-12, -8, -4, 0, 4, 8, 12].map((tick) => (
                      <div
                        key={tick}
                        className={`tick ${keySemitones === tick ? 'active' : ''}`}
                        onClick={() => handleKeyChange(tick)}
                      />
                    ))}
                  </div>
                </div>

                {/* Tempo Speed Control */}
                <div className='slider-control-item' style={{ marginTop: 12 }}>
                  <div className='slider-header'>
                    <span>Playback Tempo</span>
                    <span className='val-badge'>
                      {tempoPercent > 0 ? `+${tempoPercent}% (Fast)` : tempoPercent < 0 ? `${tempoPercent}% (Slow)` : '1.0x Normal'}
                    </span>
                  </div>
                  <input
                    type='range'
                    min='-50'
                    max='50'
                    step='5'
                    value={tempoPercent}
                    onChange={(e) => handleTempoChange(Number(e.target.value))}
                    className='range-slider'
                  />
                </div>

                {/* Lyrics Timing Sync Offset */}
                <div className='slider-control-item' style={{ marginTop: 12 }}>
                  <div className='slider-header'>
                    <span>Lyrics Sync Timing Offset</span>
                    <span className='val-badge'>
                      {lyricSyncOffset > 0 ? `+${lyricSyncOffset} ms` : lyricSyncOffset < 0 ? `${lyricSyncOffset} ms` : 'Synced (0 ms)'}
                    </span>
                  </div>
                  <input
                    type='range'
                    min='-2000'
                    max='2000'
                    step='100'
                    value={lyricSyncOffset}
                    onChange={(e) => setLyricSyncOffset(Number(e.target.value))}
                    className='range-slider'
                  />
                </div>
              </div>
            )}

            {/* 4. Live Microphone & Vocal FX */}
            {(personalizeTab === 'all' || personalizeTab === 'mic') && (
              <div className='feature-card'>
                <h4 className='section-title'>🎙️ Live Microphone & Vocal DSP</h4>

                <div className='toggle-row'>
                  <span className='toggle-label'>Enable Microphone Pitch Tracking</span>
                  <div
                    className={`toggle-switch ${micEnabled ? 'on' : ''}`}
                    onClick={() => setMicEnabled(!micEnabled)}
                  >
                    <div className='knob'></div>
                  </div>
                </div>

                {micEnabled && (
                  <div className='slider-group'>
                    <div className='slider-control-item'>
                      <div className='slider-header'>
                        <span>Microphone Input Volume</span>
                        <span className='val-badge'>{micVolume}%</span>
                      </div>
                      <input
                        type='range'
                        min='0'
                        max='100'
                        value={micVolume}
                        onChange={(e) => setMicVolume(Number(e.target.value))}
                        className='range-slider'
                      />
                    </div>

                    <div className='field-group'>
                      <label>Studio Reverb Effect</label>
                      <select
                        className='select-input'
                        value={reverbPreset}
                        onChange={(e) => setReverbPreset(e.target.value as any)}
                      >
                        <option value='off'>Off (Dry Studio)</option>
                        <option value='room'>Small Room Reverb</option>
                        <option value='stage'>Live Stage Hall</option>
                        <option value='concert'>Concert Auditorium</option>
                        <option value='arena'>Giant Arena Space</option>
                      </select>
                    </div>

                    <div className='slider-control-item'>
                      <div className='slider-header'>
                        <span>Echo Delay</span>
                        <span className='val-badge'>{echoDelay} ms</span>
                      </div>
                      <input
                        type='range'
                        min='0'
                        max='500'
                        step='10'
                        value={echoDelay}
                        onChange={(e) => setEchoDelay(Number(e.target.value))}
                        className='range-slider'
                      />
                    </div>

                    <div className='field-group'>
                      <label>Auto-Tune / Pitch Quantize</label>
                      <select
                        className='select-input'
                        value={autoTune}
                        onChange={(e) => setAutoTune(e.target.value as any)}
                      >
                        <option value='off'>Off (Natural Singing)</option>
                        <option value='mild'>Mild Pitch Assist</option>
                        <option value='strong'>Hard Auto-Tune (Pop/T-Pain Style)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Stage Visuals & Lyric Customization */}
            {(personalizeTab === 'all' || personalizeTab === 'visuals') && (
              <div className='feature-card'>
                <h4 className='section-title'>🎨 Visual Stage Themes & Styling</h4>

                <div className='field-group'>
                  <label>Background Stage Theme</label>
                  <select
                    className='select-input'
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                  >
                    <option value='ambient'>Ambient Track Color</option>
                    <option value='neon'>Neon Party (Vibrant Magenta)</option>
                    <option value='cyberpunk'>Cyberpunk City (Teal/Dark)</option>
                    <option value='space'>Space Nebula (Deep Purple)</option>
                    <option value='synthwave'>Retro Synthwave (Gradient)</option>
                  </select>
                </div>

                <div className='field-group'>
                  <label>Lyric Glow Highlight Color</label>
                  <select
                    className='select-input'
                    value={lyricColor}
                    onChange={(e) => setLyricColor(e.target.value as any)}
                  >
                    <option value='green'>KaraFun Vibrant Green</option>
                    <option value='gold'>Golden Disco Glow</option>
                    <option value='cyan'>Electric Neon Blue</option>
                    <option value='pink'>Cyberpunk Pink</option>
                  </select>
                </div>

                <div className='field-group'>
                  <label>Lyrics Display Font Size</label>
                  <select
                    className='select-input'
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as any)}
                  >
                    <option value='normal'>Normal Stage Size</option>
                    <option value='large'>Large Screen Mode</option>
                    <option value='giant'>Giant Arena Font</option>
                  </select>
                </div>

                <button
                  className='fullscreen-action-btn'
                  onClick={toggleFullscreen}
                >
                  <FullscreenIcon />
                  <span>Toggle Fullscreen Stage</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Party Queue Drawer */}
      {showQueueDrawer && (
        <div className='party-queue-drawer'>
          <div className='drawer-header'>
            <h3>Karaoke Party Queue</h3>
            <button className='back-button' onClick={() => setShowQueueDrawer(false)}>
              <CloseIcon />
            </button>
          </div>

          <div className='queue-item'>
            <img src={track.album?.images[0]?.url} alt='Now' className='song-cover' />
            <div className='info'>
              <p className='title'>Now Playing: {track.name}</p>
              <p className='singer'>Singer: {singerName}</p>
            </div>
          </div>

          <div className='queue-item'>
            <img src={track.album?.images[0]?.url} alt='Next' className='song-cover' />
            <div className='info'>
              <p className='title'>Up Next: {track.name} (Remix)</p>
              <p className='singer'>Singer: Alex</p>
            </div>
          </div>

          <div className='queue-item'>
            <img src={track.album?.images[0]?.url} alt='Next' className='song-cover' />
            <div className='info'>
              <p className='title'>Up Next: Chal Dil Mere</p>
              <p className='singer'>Singer: Sarah</p>
            </div>
          </div>
        </div>
      )}



      {/* Synchronized Word-by-Word Karaoke Lyrics Display */}
      <div className='karaoke-lyrics-box' ref={lyricsBoxRef}>
        {sampleLyrics.map((line, idx) => {
          const isActiveLine = idx === activeLyricIndex;
          const isPassedLine = idx < activeLyricIndex;

          return (
            <div
              key={line.id}
              className={`lyric-line font-${fontSize} ${isActiveLine ? 'active' : isPassedLine ? 'passed' : ''}`}
              onClick={() => playerService.seekToPosition(line.timeSec * 1000)}
            >
              {line.words.map((w, wIdx) => {
                const isWordSung = currentSec >= w.endSec || isPassedLine;
                const isWordActive = isActiveLine && currentSec >= w.startSec && currentSec < w.endSec;

                return (
                  <span
                    key={wIdx}
                    className={`karaoke-word theme-${lyricColor} ${isWordSung ? 'sung' : ''} ${isWordActive ? 'active' : ''}`}
                  >
                    {w.word}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* KaraFun Branding Overlay & QR Code */}
      <div className='karaoke-branding-bar'>
        <div className='qr-box'>
          <svg viewBox='0 0 24 24' width='36' height='36' fill='#000'>
            <path d='M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v3h-3v-3zm-5 0h3v3h-3v-3zm2 5h3v3h-3v-3zm3 0h3v3h-3v-3zm-3-3h3v3h-3v-3zm-2 3h2v2h-2v-2z'/>
          </svg>
        </div>
        <div className='karafun-logo'>KaraFun</div>
      </div>

      {/* Track Card Badge */}
      <div className='karaoke-track-card'>
        <img
          src={track.album?.images[0]?.url}
          alt={track.name}
          className={`thumb ${isPlaying ? 'spinning' : ''}`}
        />
        <div className='meta'>
          <h4 className='title'>{track.name}</h4>
          <p className='artist'>{track.artists[0]?.name} {singerName !== 'Singer' ? `• Sung by ${singerName}` : ''}</p>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className='karaoke-controls-bar'>
        <div className='seek-row'>
          <span className='time'>{secondsToTime(currentSec)}</span>
          <div className='bar-bg' onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            playerService.seekToPosition(pct * (duration || 180000));
          }}>
            <div
              className='bar-fill'
              style={{ width: `${(position / (duration || 1)) * 100}%` }}
            />
          </div>
          <span className='time'>{secondsToTime(Math.floor(duration / 1000))}</span>
        </div>

        <div className='buttons-row'>
          <button
            className='btn'
            aria-label='Previous Track'
            onClick={() => playerService.previousTrack()}
          >
            <SkipBack />
          </button>

          <button
            className='btn play-btn'
            aria-label='Play / Pause'
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>

          <button
            className='btn'
            aria-label='Next Track'
            onClick={() => playerService.nextTrack()}
          >
            <SkipNext />
          </button>
        </div>
      </div>
    </div>
  );
});

export default KaraokePage;
