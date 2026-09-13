import React, { FC, memo, useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { message, Modal, Spin } from 'antd';
import {
  FaArrowLeft,
  FaPlay,
  FaPause,
  FaVolumeHigh,
  FaVolumeXmark,
  FaCopy,
  FaCheck,
  FaUsers,
  FaPaperPlane,
  FaMusic,
  FaTrash,
  FaMagnifyingGlass,
  FaCrown,
  FaLink,
  FaUserPlus,
  FaQrcode,
  FaDoorOpen,
  FaRotateRight,
  FaHeadphones,
  FaComments,
} from 'react-icons/fa6';

// Styles
import '../../styles/RoomView.scss';

// Redux & Services
import { useAppDispatch, useAppSelector } from '../../store/store';
import { uiActions } from '../../store/slices/ui';
import { roomService, RoomData, RoomMessageData, RoomMemberData } from '../../services/rooms';
import { socialService, UserSummary } from '../../services/social';
import { playerService } from '../../services/player';
import axios from '../../axios';
import { formatLocalTrack, normalizeMediaUrl } from '../../utils';

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const RoomView: FC = memo(() => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<number>>(new Set());
  const [invitedFriends, setInvitedFriends] = useState<Set<number>>(new Set());
  const [invitingFriendId, setInvitingFriendId] = useState<number | null>(null);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [inviteTab, setInviteTab] = useState<'friends' | 'link'>('friends');

  // Synced audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  // Track the currently loaded audio src and id to detect track changes
  const loadedTrackUrlRef = useRef<string | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  // Always-fresh room ref for use inside async callbacks (avoids stale closures)
  const roomRef = useRef<RoomData | null>(null);
  const isHostRef = useRef(false);

  // Chat & Responsive View state
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
  const [mobileTab, setMobileTab] = useState<'player' | 'chat'>('player');
  const [messages, setMessages] = useState<RoomMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Song Picker Modal state
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const [availableTracks, setAvailableTracks] = useState<any[]>([]);
  const [trackSearch, setTrackSearch] = useState('');
  const [loadingTracks, setLoadingTracks] = useState(false);

  const isHost = Boolean(user && room && String(user.id) === String(room.host_id));
  const lastHardSeekTimeRef = useRef<number>(0);

  // Keep refs in sync so async intervals always have fresh values
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  /**
   * Calculates live playback position using the server-computed position or server_timestamp.
   * Completely immune to client clock skew or timezone offsets across different devices.
   */
  const calcLivePosition = useCallback((state?: {
    is_playing: boolean;
    position_seconds: number;
    calculated_position?: number;
    position_updated_at?: string;
    server_timestamp?: number;
  } | null): number => {
    if (!state) return 0;
    if (!state.is_playing) return Math.max(0, state.position_seconds || 0);

    if (typeof state.calculated_position === 'number' && state.calculated_position >= 0) {
      return state.calculated_position;
    }

    if (state.position_updated_at && state.server_timestamp) {
      const serverUpdatedSec = new Date(state.position_updated_at).getTime() / 1000;
      const elapsed = Math.max(0, state.server_timestamp - serverUpdatedSec);
      return Math.max(0, (state.position_seconds || 0) + elapsed);
    }

    return Math.max(0, state.position_seconds || 0);
  }, []);

  // Check if ?invite=true was passed in the URL (e.g. upon room creation)
  useEffect(() => {
    if (searchParams.get('invite') === 'true' || searchParams.get('invite') === '1') {
      setInviteOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('invite');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Pause global player on enter so previous songs don't clash or loop, and clean up room audio on leave
  useEffect(() => {
    playerService.pausePlayback().catch(() => {});
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Initial room load — automatically joins logged-in users so they become active members
  const loadRoom = useCallback(async () => {
    if (!code) return;
    try {
      if (user && user.id !== 'guest') {
        const joined = await roomService.joinRoom(code.toUpperCase());
        setRoom(joined);
        if (joined.current_track) {
          loadedTrackIdRef.current = String(joined.current_track.id);
          const rawUrl =
            joined.current_track.audio_file ||
            joined.current_track.audio_url ||
            joined.current_track.media_url ||
            joined.current_track.url;
          loadedTrackUrlRef.current = normalizeMediaUrl(rawUrl);
        }
        if (joined.recent_messages) {
          setMessages(joined.recent_messages);
        }
      } else {
        const data = await roomService.getRoom(code);
        setRoom(data);
        if (data.current_track) {
          loadedTrackIdRef.current = String(data.current_track.id);
          const rawUrl =
            data.current_track.audio_file ||
            data.current_track.audio_url ||
            data.current_track.media_url ||
            data.current_track.url;
          loadedTrackUrlRef.current = normalizeMediaUrl(rawUrl);
        }
        if (data.recent_messages) {
          setMessages(data.recent_messages);
        }
      }
    } catch (err: any) {
      // Fallback to getRoom if joinRoom encounters any issue (e.g. public view)
      try {
        const data = await roomService.getRoom(code);
        setRoom(data);
        if (data.current_track) {
          loadedTrackIdRef.current = String(data.current_track.id);
          const rawUrl =
            data.current_track.audio_file ||
            data.current_track.audio_url ||
            data.current_track.media_url ||
            data.current_track.url;
          loadedTrackUrlRef.current = normalizeMediaUrl(rawUrl);
        }
        if (data.recent_messages) setMessages(data.recent_messages);
      } catch {
        message.error('Failed to load or join jam room.');
        navigate('/rooms');
      }
    } finally {
      setLoading(false);
    }
  }, [code, navigate, user]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Fetch friends list when invite modal opens
  const fetchFriends = useCallback(async () => {
    if (!user || user.id === 'guest') return;
    setLoadingFriends(true);
    try {
      const list = await socialService.getFriends();
      setFriends(list);
    } catch {
      // non-critical
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

  useEffect(() => {
    if (inviteOpen) {
      fetchFriends();
    }
  }, [inviteOpen, fetchFriends]);

  const handleSendInvite = async (friend: UserSummary) => {
    if (!room) return;
    setInvitingFriendId(friend.id);
    try {
      const inviteUrl = `${window.location.origin}/room/${room.code}`;
      const inviteText = `🎧 Join my jam room "${room.name}" to listen together! Code: ${room.code}\n${inviteUrl}`;
      await socialService.sendMessage(friend.id, inviteText);
      setInvitedFriends((prev) => new Set(prev).add(friend.id));
      message.success(`Invite sent to ${friend.display_name}! 🚀`);
    } catch (err: any) {
      message.error(err?.response?.data?.error || `Failed to send invite to ${friend.display_name}.`);
    } finally {
      setInvitingFriendId(null);
    }
  };

  const handleSendBatchInvites = async () => {
    if (!room || selectedFriends.size === 0) return;
    setSendingBatch(true);
    const inviteUrl = `${window.location.origin}/room/${room.code}`;
    const inviteText = `🎧 Join my jam room "${room.name}" to listen together! Code: ${room.code}\n${inviteUrl}`;

    let successCount = 0;
    const targets = Array.from(selectedFriends);
    for (const fId of targets) {
      try {
        await socialService.sendMessage(fId, inviteText);
        setInvitedFriends((prev) => new Set(prev).add(fId));
        successCount++;
      } catch {}
    }
    setSelectedFriends(new Set());
    setSendingBatch(false);
    if (successCount > 0) {
      message.success(`Invited ${successCount} friend${successCount > 1 ? 's' : ''} to the room! 🚀`);
    } else {
      message.error('Failed to send invites.');
    }
  };

  const toggleSelectFriend = (id: number) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (filteredList: UserSummary[]) => {
    const uninvited = filteredList.filter((f) => !invitedFriends.has(f.id));
    if (selectedFriends.size === uninvited.length && uninvited.length > 0) {
      setSelectedFriends(new Set());
    } else {
      setSelectedFriends(new Set(uninvited.map((f) => f.id)));
    }
  };

  // Autoplay Protection & Playback State
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const autoplayBlockedRef = useRef(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioUnlockedRef = useRef(false);

  // Hosts have audio unlocked by default
  useEffect(() => {
    if (isHost) {
      setAudioUnlocked(true);
      audioUnlockedRef.current = true;
    }
  }, [isHost]);

  const attemptPlayListener = useCallback((audio: HTMLAudioElement, targetPos: number, isDirectUserGesture = false) => {
    if (!audio) return;
    if (!audioUnlockedRef.current && !isDirectUserGesture) return;
    if (autoplayBlockedRef.current && !isDirectUserGesture) return;

    if (isDirectUserGesture) {
      audioUnlockedRef.current = true;
      setAudioUnlocked(true);
      autoplayBlockedRef.current = false;
      setAutoplayBlocked(false);
    }

    audio.muted = false;
    if (audio.volume === 0) {
      audio.volume = volume || 0.8;
    }

    // Only set currentTime if audio is strictly paused (never interrupt playing audio)
    if (audio.paused && targetPos > 0 && Math.abs(audio.currentTime - targetPos) > 1.0) {
      try {
        audio.currentTime = targetPos;
      } catch {}
    }
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Re-enforce time after play initializes buffer successfully
          // This fixes the bug where browsers ignore currentTime setting before playback starts
          if (targetPos > 0 && Math.abs(audio.currentTime - targetPos) > 1.0) {
            try { audio.currentTime = targetPos; } catch {}
          }
          audioUnlockedRef.current = true;
          setAudioUnlocked(true);
          autoplayBlockedRef.current = false;
          setAutoplayBlocked(false);
          setIsAudioPlaying(true);
        })
        .catch((err: any) => {
          if (err.name === 'NotAllowedError' || err.name === 'NotSupportedError') {
            autoplayBlockedRef.current = true;
            setAutoplayBlocked(true);
            setIsAudioPlaying(false);
          }
        });
    }
  }, [volume]);

  // Primary Join & Enable Sound Action (Guaranteed User Gesture to unlock HTML5 Audio for the tab)
  const handleJoinAndEnableSound = useCallback(async () => {
    audioUnlockedRef.current = true;
    setAudioUnlocked(true);
    autoplayBlockedRef.current = false;
    setAutoplayBlocked(false);

    const audio = audioRef.current;
    if (audio) {
      audio.muted = false;
      audio.volume = volume || 0.8;

      const currentRoom = roomRef.current;
      if (currentRoom?.is_playing) {
        const livePos = calcLivePosition(currentRoom);
        if (livePos > 0) {
          try { audio.currentTime = livePos; } catch {}
        }
        await audio.play().catch(() => {});
        setIsAudioPlaying(true);
        message.success('Audio enabled! You are in live sync 🎧');
      } else {
        // Prime audio element for future programmatic play
        try {
          const p = audio.play();
          if (p !== undefined) {
            p.then(() => {
              if (!roomRef.current?.is_playing) {
                audio.pause();
              }
            }).catch(() => {});
          }
        } catch {}
        message.success('Audio unlocked! Ready to listen 🎧');
      }
    }
  }, [volume, calcLivePosition]);

  // Global user gesture unlocker: any tap, click, or keypress unlocks audio playback
  useEffect(() => {
    const unlockAudio = () => {
      audioUnlockedRef.current = true;
      setAudioUnlocked(true);
      autoplayBlockedRef.current = false;
      setAutoplayBlocked(false);

      const audio = audioRef.current;
      if (!audio) return;
      
      audio.muted = false;
      if (audio.volume === 0) {
        audio.volume = volume || 0.8;
      }

      const currentRoom = roomRef.current;
      if (!isHostRef.current && currentRoom?.is_playing && audio.paused) {
        const livePos = calcLivePosition(currentRoom);
        attemptPlayListener(audio, livePos, true);
      }
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [volume, calcLivePosition, attemptPlayListener]);

  const handleStartListening = handleJoinAndEnableSound;

  // Host Heartbeat: Periodically send host's true currentTime to backend so listeners stay in tight sync
  useEffect(() => {
    if (!code) return;
    const heartbeatInterval = setInterval(() => {
      if (isHostRef.current && roomRef.current?.is_playing && audioRef.current && !audioRef.current.paused) {
        roomService.syncPlayback(code, {
          action: 'heartbeat',
          position_seconds: audioRef.current.currentTime,
        }).catch(() => {});
      }
    }, 3500);
    return () => clearInterval(heartbeatInterval);
  }, [code]);

  // Pre-load available tracks for auto-advance queue ordering
  useEffect(() => {
    axios.get('/api/tracks/').then((res) => {
      const tracks = (res.data || []).map(formatLocalTrack).filter(Boolean);
      setAvailableTracks(tracks);
    }).catch(() => {});
  }, []);

  // Periodic State Sync & Smooth Drift Correction (Polls every 1500ms)
  useEffect(() => {
    if (!code || isSeeking) return;

    const syncInterval = setInterval(async () => {
      try {
        const state = await roomService.getRoomState(code);

        // Track change detection by ID
        const currentTrackId = state.current_track ? String(state.current_track.id) : null;
        const rawNewTrackUrl =
          state.current_track?.audio_file ||
          state.current_track?.audio_url ||
          state.current_track?.media_url ||
          state.current_track?.url ||
          null;
        const newTrackUrl = rawNewTrackUrl ? normalizeMediaUrl(rawNewTrackUrl) : null;

        const trackChanged = Boolean(
          currentTrackId && loadedTrackIdRef.current && currentTrackId !== loadedTrackIdRef.current
        );

        const livePos = calcLivePosition(state);

        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            is_playing: state.is_playing,
            position_seconds: state.position_seconds,
            calculated_position: livePos,
            position_updated_at: state.position_updated_at,
            server_timestamp: state.server_timestamp,
            current_track: state.current_track,
            member_count: state.member_count,
          };
        });

        // LISTENERS ONLY: Continuous smooth audio playback without restarting or stuttering
        if (!isHostRef.current && audioRef.current) {
          const audio = audioRef.current;

          // 1) Track changed by host → change source
          if (trackChanged && newTrackUrl) {
            loadedTrackIdRef.current = currentTrackId;
            loadedTrackUrlRef.current = newTrackUrl;
            if (audio.src !== newTrackUrl) {
              audio.src = newTrackUrl;
              audio.load();
            }
            if (state.is_playing) {
              attemptPlayListener(audio, livePos);
            }
            return;
          }

          // If audio has no src set yet, set it
          if (newTrackUrl && (!audio.src || audio.src === '' || audio.src === window.location.href)) {
            loadedTrackIdRef.current = currentTrackId;
            loadedTrackUrlRef.current = newTrackUrl;
            audio.src = newTrackUrl;
            audio.load();
          }

          // 2) Seamless Playback & Smooth Drift Alignment
          if (state.is_playing) {
            if (audio.paused) {
              // Only attempt play when paused - never restart if already playing!
              if (!autoplayBlockedRef.current) {
                attemptPlayListener(audio, livePos);
              }
            } else {
              // Audio is ALREADY playing continuously -> never reset currentTime on small drift!
              const drift = livePos - audio.currentTime;
              const absDrift = Math.abs(drift);
              const nowMs = performance.now();

              // Hard seek ONLY on severe desync (> 8 seconds) with 10s cooldown
              if (absDrift > 8.0 && nowMs - lastHardSeekTimeRef.current > 10000) {
                lastHardSeekTimeRef.current = nowMs;
                audio.currentTime = livePos;
                audio.playbackRate = 1.0;
              } else if (absDrift > 0.4) {
                // Gentle playback rate adjustment (imperceptible pitch shift, no clicks or reloads)
                if (drift > 0) {
                  audio.playbackRate = 1.02;
                } else {
                  audio.playbackRate = 0.98;
                }
              } else {
                audio.playbackRate = 1.0;
              }
            }
          } else {
            // Room paused by host
            audio.playbackRate = 1.0;
            if (!audio.paused) {
              audio.pause();
              audio.currentTime = state.position_seconds || 0;
            }
          }
        }
      } catch (err) {
        console.warn('Sync poll error:', err);
      }
    }, 1500);

    return () => clearInterval(syncInterval);
  }, [code, isSeeking, calcLivePosition, attemptPlayListener]);

  // Real-time timestamp ticker for listeners and joiners (updates UI smoothly every 250ms)
  useEffect(() => {
    const timer = setInterval(() => {
      if (isSeeking) return;
      if (audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
        setCurrentTime(audioRef.current.currentTime);
        if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
      } else if (roomRef.current?.is_playing) {
        const livePos = calcLivePosition(roomRef.current);
        setCurrentTime(livePos);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [isSeeking]);

  // Manual Sync & Refresh Audio Button Handler
  const handleSyncAudio = async () => {
    if (!code) return;
    try {
      const freshState = await roomService.getRoomState(code);
      const livePos = calcLivePosition(freshState);

      if (audioRef.current) {
        audioRef.current.currentTime = livePos;
        if (freshState.is_playing) {
          autoplayBlockedRef.current = false;
          setAutoplayBlocked(false);
          await audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      }
      setCurrentTime(livePos);
      message.success('Audio synced to exact live position! 🎧');
    } catch {
      message.error('Failed to sync audio.');
    }
  };

  // ── Hard-block listener audio control via native events ──
  // Prevents keyboard space-bar, browser mini-player, or any other mechanism
  // from letting a listener play/pause independently of the host.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const guardPlay = (e: Event) => {
      // If the listener (not host) triggered play on their own (e.g. keyboard),
      // and the room is currently paused, immediately stop it.
      if (!isHostRef.current) {
        const r = roomRef.current;
        if (r && !r.is_playing) {
          (e.target as HTMLAudioElement).pause();
        }
      }
    };

    audio.addEventListener('play', guardPlay);
    return () => audio.removeEventListener('play', guardPlay);
  }, [room?.code]); // re-attach when room changes


  // Periodic Chat Poll (Every 2.5 seconds)
  useEffect(() => {
    if (!code) return;

    const chatInterval = setInterval(async () => {
      try {
        const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : undefined;
        const newMsgs = await roomService.getRoomChat(code, lastMsgId);
        if (newMsgs && newMsgs.length > 0) {
          setMessages((prev) => [...prev, ...newMsgs]);
        }
      } catch (err) {
        console.warn('Chat poll error:', err);
      }
    }, 2500);

    return () => clearInterval(chatInterval);
  }, [code, messages]);

  // Scroll chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio event listeners
  const onTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  // Host Playback Actions
  const handleHostTogglePlay = async () => {
    if (!isHost || !room) return;
    const nextPlay = !room.is_playing;
    const pos = audioRef.current ? audioRef.current.currentTime : (room.position_seconds || 0);

    const audio = audioRef.current;
    if (audio) {
      if (nextPlay) {
        audio.muted = false;
        if (audio.volume === 0) audio.volume = volume || 0.8;
        if (trackAudioUrl && audio.src !== trackAudioUrl) {
          audio.src = trackAudioUrl;
          audio.load();
        }
        audio.play().catch((e) => console.warn('Host play error:', e));
      } else {
        audio.pause();
      }
    }

    try {
      const updated = await roomService.syncPlayback(room.code, {
        action: nextPlay ? 'play' : 'pause',
        position_seconds: pos,
      });
      setRoom((prev) => (prev ? { ...prev, is_playing: updated.is_playing } : null));
    } catch (err) {
      console.error('Playback sync error:', err);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    setIsSeeking(true);
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekCommit = async () => {
    if (!isHost || !room || !audioRef.current) return;
    audioRef.current.currentTime = seekValue;
    setCurrentTime(seekValue);
    setIsSeeking(false);

    try {
      await roomService.syncPlayback(room.code, {
        action: 'seek',
        position_seconds: seekValue,
      });
    } catch (err) {
      console.error('Seek sync error:', err);
    }
  };

  const handleSelectTrack = async (track: any) => {
    if (!isHost || !room) return;
    setSongPickerOpen(false);

    try {
      const updated = await roomService.syncPlayback(room.code, {
        action: 'change_track',
        track_id: track.id,
        auto_play: true,
      });

      // Update room with new track
      setRoom((prev) =>
        prev ? { ...prev, current_track: updated.current_track, is_playing: true } : null
      );

      // Host: update local audio element with normalized public URL
      const rawUrl =
        updated.current_track?.audio_file ||
        updated.current_track?.audio_url ||
        updated.current_track?.media_url ||
        updated.current_track?.url ||
        track?.audio_file ||
        track?.audio_url ||
        track?.media_url ||
        track?.url;
      const normalizedUrl = normalizeMediaUrl(rawUrl);

      if (normalizedUrl && audioRef.current) {
        loadedTrackIdRef.current = String(track.id);
        loadedTrackUrlRef.current = normalizedUrl;
        audioRef.current.src = normalizedUrl;
        audioRef.current.load();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
        audioRef.current.volume = volume || 0.8;
        audioRef.current.play().catch((e) => console.warn('Host play error:', e));
      }

      message.success(`Now playing: ${track.title || track.name}`);
    } catch (err) {
      message.error('Failed to change song');
    }
  };

  // Send chat message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || user.id === 'guest') {
      return dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
    }

    const text = newMessage.trim();
    if (!text || !room) return;

    setSendingMsg(true);
    try {
      const msg = await roomService.sendChatMessage(room.code, text);
      setMessages((prev) => [...prev, msg]);
      setNewMessage('');
    } catch (err) {
      message.error('Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!room) return;
    const link = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    message.success('Invite link copied! 🔗');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLeaveRoom = async () => {
    if (room && user && user.id !== 'guest') {
      try {
        await roomService.leaveRoom(room.code);
      } catch {}
    }
    navigate('/rooms');
  };

  const handleDeleteRoom = () => {
    Modal.confirm({
      title: 'End Jam Session?',
      content: 'This will close the room for all current listeners.',
      okText: 'End Room',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        if (!room) return;
        try {
          await roomService.deleteRoom(room.code);
          message.success('Jam room ended.');
          navigate('/rooms');
        } catch {
          message.error('Failed to delete room');
        }
      },
    });
  };

  // Load local tracks for song picker
  const openSongPicker = async () => {
    setSongPickerOpen(true);
    setLoadingTracks(true);
    try {
      const res = await axios.get('/api/tracks/');
      const tracks = (res.data || []).map(formatLocalTrack).filter(Boolean);
      setAvailableTracks(tracks);
    } catch (err) {
      console.error('Failed to load tracks:', err);
    } finally {
      setLoadingTracks(false);
    }
  };

  const filteredTracks = availableTracks.filter((t) => {
    if (!trackSearch.trim()) return true;
    const q = trackSearch.toLowerCase();
    return t.name?.toLowerCase().includes(q) || t.artists?.[0]?.name?.toLowerCase().includes(q);
  });

  if (loading || !room) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#fff' }}>
        <Spin size='large' />
        <p style={{ marginTop: '16px', color: '#a0a0a0' }}>Connecting to Jam Room...</p>
      </div>
    );
  }

  const track = room.current_track;
  const trackAudioUrl = normalizeMediaUrl(
    track?.audio_file || track?.audio_url || track?.media_url || track?.url
  );
  const trackArtwork = normalizeMediaUrl(
    track?.thumbnail ||
    track?.album?.images?.[0]?.url,
    'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4'
  );

  const inviteLink = `${window.location.origin}/room/${room.code}`;

  const trackTitle = track?.title || track?.name || 'No Track Selected';
  const trackArtist = track?.youtube_channel?.name || track?.artists?.[0]?.name || 'Pick a song to start jam';
  const effectiveDuration =
    duration > 0
      ? duration
      : (track?.duration_seconds || (track?.duration_ms ? track.duration_ms / 1000 : 0));
  const effectiveCurrentTime = isSeeking
    ? seekValue
    : (currentTime > 0 ? currentTime : (room ? calcLivePosition(room) : 0));

  const handleSeekEnd = handleSeekCommit;
  const handleOpenSongPicker = openSongPicker;
  const handleTogglePlay = handleHostTogglePlay;

  return (
    <div className='room-view-container'>
      {/* Hidden Audio Element for playback */}
      <audio
        ref={audioRef}
        src={trackAudioUrl || undefined}
        preload='auto'
        playsInline
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setIsAudioPlaying(true)}
        onPlaying={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
        onCanPlay={() => {
          const audio = audioRef.current;
          if (!audio) return;
          const currentRoom = roomRef.current;
          if (currentRoom?.is_playing && audio.paused) {
            if (isHostRef.current) {
              audio.muted = false;
              if (audio.volume === 0) audio.volume = volume || 0.8;
              audio.play().catch(() => {});
            } else if (!isAudioPlaying) {
              const livePos = calcLivePosition(currentRoom);
              attemptPlayListener(audio, livePos);
            }
          }
        }}
        onError={(e) => {
          console.warn('Audio playback error on element:', e);
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio) return;

          setDuration(audio.duration);
          if (trackAudioUrl) loadedTrackUrlRef.current = trackAudioUrl;
          if (room?.current_track) {
            loadedTrackIdRef.current = String(room.current_track.id);
          }
          audio.volume = volume || 0.8;
          audio.muted = muted;

          const currentRoom = roomRef.current;
          if (currentRoom) {
            const livePos = calcLivePosition(currentRoom);
            if (currentRoom.is_playing) {
              audio.muted = false;
              if (audio.volume === 0) audio.volume = volume || 0.8;
              if (isHostRef.current) {
                audio.play().catch(() => {});
              } else if (audio.paused) {
                attemptPlayListener(audio, livePos);
              }
            } else {
              audio.pause();
              audio.currentTime = currentRoom.position_seconds || 0;
            }
          }
        }}
        onEnded={() => {
          // When a track ends, only the host advances or pauses for the room
          if (isHostRef.current && roomRef.current) {
            const curTrk = roomRef.current.current_track;
            if (availableTracks.length > 0 && curTrk) {
              const idx = availableTracks.findIndex((t) => t.id === curTrk.id);
              const nextIdx = idx >= 0 ? (idx + 1) % availableTracks.length : 0;
              const nextTrack = availableTracks[nextIdx];
              if (nextTrack) {
                handleSelectTrack(nextTrack);
                return;
              }
            }
            roomService.syncPlayback(roomRef.current.code, {
              action: 'pause',
              position_seconds: 0,
            }).catch(() => {});
            setRoom((prev) => prev ? { ...prev, is_playing: false } : null);
          }
        }}
      />

      {/* Top Header Bar */}
      <div className='room-header'>
        <div className='room-header__left'>
          <button
            type='button'
            onClick={() => navigate('/rooms')}
            className='room-header__back-btn'
            aria-label='Back to Jam Rooms'
          >
            <FaArrowLeft size={14} />
          </button>

          <div className='room-header__info'>
            <div className='room-header__title-row'>
              <h1 className='room-header__title'>
                {room.name}
              </h1>
              {/* Room Code Badge */}
              <button
                type='button'
                onClick={handleCopyCode}
                title='Click to copy room code'
                className='room-header__code-badge'
              >
                {copied ? <FaCheck size={11} /> : <FaCopy size={11} />}
                <span>{room.code}</span>
              </button>
            </div>
            <span className='room-header__meta'>
              Host: <strong style={{ color: '#ffffff' }}>{room.host_name}</strong>
              {room.description && ` • ${room.description}`}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className='room-header__actions'>
          {/* ── INVITE FRIENDS BUTTON ── */}
          <button
            type='button'
            onClick={() => setInviteOpen(true)}
            className='room-action-btn room-action-btn--invite'
            title='Invite Friends'
          >
            <FaUserPlus size={12} />
            <span>Invite Friends</span>
          </button>

          {/* ── DIRECT AUDIO URL LINK FOR TESTING ── */}
          {loadedTrackUrlRef.current && (
            <a
              href={loadedTrackUrlRef.current}
              target='_blank'
              rel='noopener noreferrer'
              className='room-action-btn'
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.25)',
                textDecoration: 'none',
              }}
              title='Open direct audio stream URL in new tab'
            >
              <FaLink size={12} />
              <span>Direct Audio Link</span>
            </a>
          )}

          {isHost && (
            <button
              type='button'
              onClick={handleDeleteRoom}
              className='room-action-btn room-action-btn--end'
              title='End Jam Room'
            >
              <FaTrash size={12} />
              <span>End Room</span>
            </button>
          )}

          {!isHost && (
            <button
              type='button'
              onClick={handleLeaveRoom}
              className='room-action-btn room-action-btn--leave'
              title='Leave Jam Room'
            >
              <FaDoorOpen size={12} />
              <span>Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className='room-mobile-tabs'>
        <button
          type='button'
          onClick={() => setMobileTab('player')}
          className={`room-mobile-tab-btn ${mobileTab === 'player' ? 'active' : ''}`}
        >
          <FaHeadphones size={13} />
          <span>Stage</span>
        </button>
        <button
          type='button'
          onClick={() => setMobileTab('chat')}
          className={`room-mobile-tab-btn ${mobileTab === 'chat' ? 'active' : ''}`}
        >
          <FaComments size={13} />
          <span>Chat {messages.length > 0 && `(${messages.length})`}</span>
        </button>
      </div>

      {/* Main Content Layout: Player Stage | Live Chat */}
      <div className='room-body-grid'>
        {/* Left: Synced Listening Stage */}
        <div className={`room-player-stage ${mobileTab !== 'player' ? 'mobile-hidden' : ''}`}>
          {/* Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            {isHost ? (
              <>
                <FaCrown size={13} color='#fbbf24' />
                <span>You are the Host (Broadcasting Live)</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isAudioPlaying ? '#10b981' : '#f59e0b',
                    boxShadow: isAudioPlaying ? '0 0 10px #10b981' : '0 0 10px #f59e0b',
                  }}
                />
                <span>
                  {isAudioPlaying
                    ? `Listening with ${room.host_name} (In Sync)`
                    : `Connected to ${room.host_name}'s Room (Click to Play Sound)`}
                </span>
              </>
            )}
          </div>

          {/* Autoplay / Click-to-Listen Banner for Listeners */}
          {!isHost && room.is_playing && (!isAudioPlaying || autoplayBlocked) && (
            <div
              onClick={handleStartListening}
              style={{
                cursor: 'pointer',
                marginBottom: '20px',
                padding: '12px 18px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔊</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                    Live Audio Streaming • Click to Listen
                  </div>
                  <div style={{ fontSize: '11px', color: '#a7f3d0' }}>
                    Tap anywhere or click button to enable synchronized audio
                  </div>
                </div>
              </div>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartListening();
                }}
                style={{
                  background: '#10b981',
                  color: '#000',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <FaPlay size={10} />
                <span>UNMUTE & PLAY</span>
              </button>
            </div>
          )}

          {/* Vinyl / Album Art */}
          <div
            className='room-vinyl-wrapper'
            onClick={!isHost && room.is_playing && !isAudioPlaying ? handleStartListening : undefined}
            style={{
              cursor: !isHost && room.is_playing && !isAudioPlaying ? 'pointer' : 'default',
            }}
          >
            <img
              src={trackArtwork}
              alt=''
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                objectFit: 'cover',
                boxShadow: room.is_playing
                  ? '0 20px 50px rgba(16, 185, 129, 0.35)'
                  : '0 10px 30px rgba(0, 0, 0, 0.6)',
                border: room.is_playing ? '2px solid #10b981' : '2px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
              }}
            />
            {room.is_playing && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '3px',
                  alignItems: 'flex-end',
                  height: '20px',
                }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      borderRadius: '2px',
                      background: '#10b981',
                      animation: `bounce${i} 0.8s ease-in-out infinite alternate`,
                      height: `${8 + i * 4}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Track Metadata */}
          <div style={{ textAlign: 'center', marginBottom: '20px', maxWidth: '420px', width: '100%', padding: '0 12px' }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 800,
                margin: '0 0 4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#ffffff',
              }}
            >
              {trackTitle}
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#a0a0a0',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {trackArtist}
            </p>
          </div>

          {/* Timeline & Progress Bar */}
          <div style={{ width: '100%', maxWidth: '440px', marginBottom: '20px', padding: '0 12px' }}>
            <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
              <input
                type='range'
                min={0}
                max={effectiveDuration || 100}
                value={effectiveCurrentTime}
                disabled={!isHost}
                onMouseDown={() => {
                  if (isHost) {
                    setIsSeeking(true);
                    setSeekValue(effectiveCurrentTime);
                  }
                }}
                onTouchStart={() => {
                  if (isHost) {
                    setIsSeeking(true);
                    setSeekValue(effectiveCurrentTime);
                  }
                }}
                onChange={(e) => {
                  if (isHost) {
                    setSeekValue(parseFloat(e.target.value));
                  }
                }}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                style={{
                  width: '100%',
                  cursor: isHost ? 'pointer' : 'default',
                  accentColor: '#10b981',
                  height: '5px',
                  borderRadius: '3px',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#808080',
                marginTop: '4px',
              }}
            >
              <span>{formatTime(effectiveCurrentTime)}</span>
              <span>{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Host Song Picker Button */}
            {isHost && (
              <button
                type='button'
                onClick={handleOpenSongPicker}
                title='Choose or Search a Track from Spotify Library'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <FaMagnifyingGlass size={13} />
                <span>Select / Change Track</span>
              </button>
            )}

            {/* Play/Pause Button (Host controlled) */}
            {isHost ? (
              <button
                type='button'
                onClick={handleTogglePlay}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {room.is_playing ? <FaPause size={20} /> : <FaPlay size={20} style={{ marginLeft: '3px' }} />}
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  color: '#a0a0a0',
                }}
              >
                {room.is_playing ? (
                  <>
                    <FaPlay size={10} color='#10b981' />
                    <span>Broadcasting Live</span>
                  </>
                ) : (
                  <>
                    <FaPause size={10} color='#f59e0b' />
                    <span>Host Paused</span>
                  </>
                )}
              </div>
            )}

            {/* Volume Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type='button'
                onClick={() => {
                  const nextMuted = !muted;
                  setMuted(nextMuted);
                  if (audioRef.current) audioRef.current.muted = nextMuted;
                }}
                style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', padding: 0 }}
              >
                {muted || volume === 0 ? <FaVolumeXmark size={15} /> : <FaVolumeHigh size={15} />}
              </button>
              <input
                type='range'
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  setMuted(false);
                  if (audioRef.current) {
                    audioRef.current.volume = val;
                    audioRef.current.muted = false;
                  }
                }}
                style={{ width: '80px', accentColor: '#10b981' }}
              />
            </div>
          </div>

          {/* Inline "Invite a friend" hint */}
          {!isHost && (
            <button
              type='button'
              onClick={() => setInviteOpen(true)}
              style={{
                marginTop: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'transparent',
                color: '#a0a0a0',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <FaUserPlus size={12} />
              <span>Invite more friends</span>
            </button>
          )}
        </div>

        {/* Right: Live Chat & Members Panel */}
        <div className={`room-chat-panel ${mobileTab !== 'chat' ? 'mobile-hidden' : ''}`}>
          {/* Tabs: Chat vs Members */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0 16px',
              flexShrink: 0,
            }}
          >
            <button
              type='button'
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '14px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'chat' ? '2px solid #10b981' : '2px solid transparent',
                color: activeTab === 'chat' ? '#10b981' : '#a0a0a0',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              💬 Live Chat ({messages.length})
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('members')}
              style={{
                flex: 1,
                padding: '14px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'members' ? '2px solid #10b981' : '2px solid transparent',
                color: activeTab === 'members' ? '#10b981' : '#a0a0a0',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              👥 Listeners ({room.member_count})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'chat' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              {/* Message Stream */}
              <div
                style={{
                  flex: 1,
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: '#6b7280', fontSize: '13px' }}>
                    Say hello to start the party! 🎉
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = user && String(user.id) === String(msg.user_id);
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                        }}
                      >
                        {!isMe && (
                          <img
                            src={normalizeMediaUrl(msg.avatar, 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png')}
                            alt=''
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          {!isMe && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#9ca3af',
                                fontWeight: 600,
                                display: 'block',
                                marginBottom: '2px',
                              }}
                            >
                              {msg.display_name || msg.username}
                            </span>
                          )}
                          <div
                            style={{
                              background: isMe ? '#10b981' : '#262626',
                              color: isMe ? '#000000' : '#ffffff',
                              padding: '8px 14px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              lineHeight: 1.4,
                              wordBreak: 'break-word',
                            }}
                          >
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <input
                  type='text'
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={user && user.id !== 'guest' ? 'Type a message...' : 'Sign in to chat'}
                  disabled={!user || user.id === 'guest'}
                  style={{
                    flex: 1,
                    background: '#242424',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '9999px',
                    padding: '8px 16px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type='submit'
                  disabled={sendingMsg || !newMessage.trim()}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: newMessage.trim() ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                    color: newMessage.trim() ? '#000000' : '#a0a0a0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                  }}
                >
                  <FaPaperPlane size={13} />
                </button>
              </form>
            </div>
          ) : (
            /* Members View */
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {room.members?.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={normalizeMediaUrl(m.avatar, 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png')}
                        alt=''
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                        {m.display_name || m.username}
                      </span>
                    </div>
                    {m.is_host && (
                      <span
                        style={{
                          background: 'rgba(251, 191, 36, 0.15)',
                          color: '#fbbf24',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        HOST 👑
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ INVITE FRIENDS MODAL ═══ */}
      <Modal
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        footer={null}
        centered
        width={520}
        styles={{
          mask: { backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.8)' },
          content: { background: '#181818', borderRadius: '20px', padding: 0, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' },
        }}
      >
        <div style={{ padding: '24px' }}>
          {/* Modal Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)',
              }}
            >
              <FaUserPlus size={22} color='#fff' />
            </div>
            <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: '20px', fontWeight: 800 }}>
              Invite Friends to Jam
            </h2>
            <p style={{ color: '#a0a0a0', margin: 0, fontSize: '13px' }}>
              Select friends to invite directly via chat, or share the room link!
            </p>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '4px',
              marginBottom: '18px',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setInviteTab('friends')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: inviteTab === 'friends' ? '#10b981' : 'transparent',
                color: inviteTab === 'friends' ? '#000' : '#d1d5db',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <FaUsers size={14} />
              <span>Friends {friends.length > 0 ? `(${friends.length})` : ''}</span>
            </button>
            <button
              onClick={() => setInviteTab('link')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: inviteTab === 'link' ? '#10b981' : 'transparent',
                color: inviteTab === 'link' ? '#000' : '#d1d5db',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <FaLink size={13} />
              <span>Room Code & Link</span>
            </button>
          </div>

          {inviteTab === 'friends' ? (
            <div>
              {/* Search Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#242424',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  marginBottom: '14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <FaMagnifyingGlass size={13} color='#9ca3af' />
                <input
                  type='text'
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder='Search friends by name or username...'
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
                {friendSearch && (
                  <button
                    onClick={() => setFriendSearch('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Friends List Container */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '6px',
                }}
              >
                {loadingFriends ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin />
                  </div>
                ) : friends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#9ca3af' }}>
                    <FaUsers size={32} style={{ margin: '0 auto 10px', opacity: 0.5, display: 'block' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '4px' }}>
                      No friends yet
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
                      Add friends to invite them directly to your room!
                    </div>
                    <button
                      onClick={() => {
                        setInviteOpen(false);
                        navigate('/friends');
                      }}
                      style={{
                        background: '#10b981',
                        color: '#000',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '7px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Find Friends
                    </button>
                  </div>
                ) : (
                  (() => {
                    const filtered = friends.filter((f) => {
                      if (!friendSearch.trim()) return true;
                      const q = friendSearch.toLowerCase();
                      return (
                        (f.display_name && f.display_name.toLowerCase().includes(q)) ||
                        (f.username && f.username.toLowerCase().includes(q))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', fontSize: '13px' }}>
                          No friends match "{friendSearch}"
                        </div>
                      );
                    }

                    return (
                      <div>
                        {/* Quick Toolbar */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px 8px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            marginBottom: '4px',
                          }}
                        >
                          <button
                            onClick={() => handleToggleSelectAll(filtered)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#34d399',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {selectedFriends.size > 0 ? 'Deselect All' : 'Select All'}
                          </button>
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>
                            {selectedFriends.size} selected
                          </span>
                        </div>

                        {filtered.map((friend) => {
                          const isSelected = selectedFriends.has(friend.id);
                          const isInvited = invitedFriends.has(friend.id);
                          const isInvitingThis = invitingFriendId === friend.id;

                          return (
                            <div
                              key={friend.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(16,185,129,0.08)' : 'transparent',
                                border: isSelected ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                                marginBottom: '2px',
                                transition: 'all 0.15s',
                              }}
                            >
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                                onClick={() => toggleSelectFriend(friend.id)}
                              >
                                <input
                                  type='checkbox'
                                  checked={isSelected}
                                  onChange={() => toggleSelectFriend(friend.id)}
                                  style={{
                                    accentColor: '#10b981',
                                    width: '16px',
                                    height: '16px',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <img
                                  src={normalizeMediaUrl(friend.avatar, 'https://cdn-icons-png.flaticon.com/512/847/847969.png')}
                                  alt=''
                                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {friend.display_name || friend.username}
                                  </div>
                                  <div style={{ color: '#6b7280', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    @{friend.username}
                                  </div>
                                </div>
                              </div>

                              {/* Action Button */}
                              <div style={{ marginLeft: '10px', flexShrink: 0 }}>
                                {isInvited ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '5px 12px',
                                      borderRadius: '9999px',
                                      background: 'rgba(16,185,129,0.15)',
                                      color: '#34d399',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                    }}
                                  >
                                    <FaCheck size={10} /> Invited
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSendInvite(friend)}
                                    disabled={isInvitingThis}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '6px 14px',
                                      borderRadius: '9999px',
                                      border: 'none',
                                      background: '#10b981',
                                      color: '#000',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: isInvitingThis ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    {isInvitingThis ? <Spin size="small" /> : <><FaPaperPlane size={10} /> Invite</>}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Batch Action Bar */}
              {selectedFriends.size > 0 && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '12px 16px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#e5e7eb' }}>
                    {selectedFriends.size} friend{selectedFriends.size > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={handleSendBatchInvites}
                    disabled={sendingBatch}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: '#10b981',
                      color: '#000',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: sendingBatch ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {sendingBatch ? <Spin size='small' /> : <><FaPaperPlane size={12} /> Send Invites ({selectedFriends.size})</>}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Big Room Code */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '2px dashed rgba(16, 185, 129, 0.4)',
                  borderRadius: '14px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '16px',
                }}
              >
                <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>
                  Room Code
                </p>
                <div
                  style={{
                    fontSize: '40px',
                    fontWeight: 900,
                    letterSpacing: '8px',
                    color: '#34d399',
                    fontFamily: 'monospace',
                    marginBottom: '12px',
                  }}
                >
                  {room.code}
                </div>
                <button
                  onClick={handleCopyCode}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: copied ? '#10b981' : 'rgba(255,255,255,0.1)',
                    color: copied ? '#000' : '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
                  {copied ? 'Code Copied!' : 'Copy Code'}
                </button>
              </div>

              {/* Shareable Link */}
              <div
                style={{
                  background: '#242424',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}
              >
                <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>
                  Direct Invite Link
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      color: '#e5e7eb',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'monospace',
                    }}
                  >
                    {inviteLink}
                  </span>
                  <button
                    onClick={handleCopyInviteLink}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: copiedLink ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                      color: copiedLink ? '#000' : '#34d399',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    {copiedLink ? <FaCheck size={11} /> : <FaLink size={11} />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* How to Join Instructions */}
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                }}
              >
                <p style={{ color: '#93c5fd', fontSize: '12px', fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaUsers size={13} /> How friends can join:
                </p>
                <ol style={{ margin: 0, paddingLeft: '18px', color: '#9ca3af', fontSize: '12px', lineHeight: 1.7 }}>
                  <li>Clicking the direct link will <strong style={{ color: '#e5e7eb' }}>automatically join</strong> them to the room!</li>
                  <li>Or go to <strong style={{ color: '#e5e7eb' }}>Live Rooms</strong>, click <strong style={{ color: '#e5e7eb' }}>"Join by Code"</strong> and enter <strong style={{ color: '#34d399' }}>{room.code}</strong></li>
                  <li>Their audio will <strong style={{ color: '#e5e7eb' }}>auto-sync</strong> in real time 🎵</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Song Picker Modal for Host */}
      <Modal
        open={songPickerOpen}
        onCancel={() => setSongPickerOpen(false)}
        footer={null}
        title={<span style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700 }}>Choose Song to Play</span>}
        styles={{
          mask: { background: 'rgba(0, 0, 0, 0.75)' },
          content: { background: '#181818', borderRadius: '16px' },
        }}
      >
        <div style={{ padding: '10px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#242424',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '8px 14px',
              marginBottom: '16px',
            }}
          >
            <FaMagnifyingGlass size={13} color='#a0a0a0' />
            <input
              type='text'
              value={trackSearch}
              onChange={(e) => setTrackSearch(e.target.value)}
              placeholder='Search tracks by title or artist...'
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {loadingTracks ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <Spin />
              </div>
            ) : filteredTracks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#a0a0a0' }}>No tracks found</div>
            ) : (
              filteredTracks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTrack(t)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#262626')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <img
                      src={t.album?.images?.[0]?.url || t.thumbnail}
                      alt=''
                      style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.name || t.title}
                      </span>
                      <span style={{ fontSize: '11px', color: '#a0a0a0' }}>
                        {t.artists?.[0]?.name || t.youtube_channel?.name}
                      </span>
                    </div>
                  </div>
                  <FaPlay size={12} color='#10b981' />
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ═══ JOIN / ENABLE SOUND MODAL FOR LISTENERS ═══ */}
      <Modal
        open={!isHost && !audioUnlocked}
        onCancel={() => {
          setAudioUnlocked(true);
        }}
        footer={null}
        centered
        closable={false}
        maskClosable={false}
        styles={{
          mask: { background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' },
          content: {
            background: 'linear-gradient(135deg, #181818 0%, #121212 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.2)',
            padding: '32px 24px',
            textAlign: 'center',
          },
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontSize: '32px',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
            }}
          >
            🎧
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px' }}>
              Join Jam & Enable Sound
            </h2>
            <p style={{ fontSize: '13px', color: '#a0a0a0', margin: 0, lineHeight: 1.5, maxWidth: '340px' }}>
              Browser autoplay policy requires a quick click to unlock live synchronized audio playback for this session.
            </p>
          </div>

          <button
            type='button'
            onClick={handleJoinAndEnableSound}
            style={{
              width: '100%',
              maxWidth: '320px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#000000',
              border: 'none',
              borderRadius: '14px',
              padding: '14px 24px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
            }}
          >
            <FaPlay size={14} />
            <span>JOIN JAM & UNMUTE AUDIO</span>
          </button>
        </div>
      </Modal>

      {/* Keyframes for playing bars animation */}
      <style>{`
        @keyframes bounce1 { from { height: 8px } to { height: 18px } }
        @keyframes bounce2 { from { height: 12px } to { height: 24px } }
        @keyframes bounce3 { from { height: 16px } to { height: 10px } }
        @keyframes bounce4 { from { height: 20px } to { height: 8px } }
      `}</style>
    </div>
  );
});

RoomView.displayName = 'RoomView';
