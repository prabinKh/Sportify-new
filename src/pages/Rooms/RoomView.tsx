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
} from 'react-icons/fa6';

// Redux & Services
import { useAppDispatch, useAppSelector } from '../../store/store';
import { uiActions } from '../../store/slices/ui';
import { roomService, RoomData, RoomMessageData, RoomMemberData } from '../../services/rooms';
import { socialService, UserSummary } from '../../services/social';
import axios from '../../axios';
import { formatLocalTrack } from '../../utils';

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
  // Track the currently loaded audio src to detect track changes
  const loadedTrackUrlRef = useRef<string | null>(null);
  // Always-fresh room ref for use inside async callbacks (avoids stale closures)
  const roomRef = useRef<RoomData | null>(null);
  const isHostRef = useRef(false);

  // Chat state
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
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

  // Keep refs in sync so async intervals always have fresh values
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  /**
   * Calculate the live playback position accounting for wall-clock drift since
   * the server last updated position. This ensures new joiners land at the
   * correct timestamp even if the state snapshot is a few seconds old.
   */
  const calcLivePosition = (state: { is_playing: boolean; position_seconds: number; position_updated_at: string; calculated_position?: number }): number => {
    if (!state.is_playing) return state.position_seconds;
    const serverUpdatedAt = new Date(state.position_updated_at).getTime() / 1000;
    const nowSec = Date.now() / 1000;
    const elapsed = Math.max(0, nowSec - serverUpdatedAt);
    return state.position_seconds + elapsed;
  };

  // Check if ?invite=true was passed in the URL (e.g. upon room creation)
  useEffect(() => {
    if (searchParams.get('invite') === 'true' || searchParams.get('invite') === '1') {
      setInviteOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('invite');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Initial room load — automatically joins logged-in users so they become active members
  const loadRoom = useCallback(async () => {
    if (!code) return;
    try {
      if (user && user.id !== 'guest') {
        const joined = await roomService.joinRoom(code.toUpperCase());
        setRoom(joined);
        if (joined.recent_messages) {
          setMessages(joined.recent_messages);
        }
      } else {
        const data = await roomService.getRoom(code);
        setRoom(data);
        if (data.recent_messages) {
          setMessages(data.recent_messages);
        }
      }
    } catch (err: any) {
      // Fallback to getRoom if joinRoom encounters any issue (e.g. public view)
      try {
        const data = await roomService.getRoom(code);
        setRoom(data);
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

  // Autoplay Protection State
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const autoplayBlockedRef = useRef(false);

  const attemptPlayListener = useCallback((audio: HTMLAudioElement, targetPos: number) => {
    if (autoplayBlockedRef.current) return;
    audio.currentTime = targetPos;
    audio.play().then(() => {
      autoplayBlockedRef.current = false;
      setAutoplayBlocked(false);
    }).catch((err: any) => {
      if (err.name === 'NotAllowedError' || err.name === 'NotSupportedError') {
        autoplayBlockedRef.current = true;
        setAutoplayBlocked(true);
      }
    });
  }, []);

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

  // Periodic State Sync & Tight Drift Correction (Polls every 800ms)
  useEffect(() => {
    if (!code || isSeeking) return;

    const syncInterval = setInterval(async () => {
      try {
        const pingStart = performance.now();
        const state = await roomService.getRoomState(code);
        const rttSec = (performance.now() - pingStart) / 1000 / 2; // latency estimate

        // Detect track change by comparing audio_file URL
        const newTrackUrl = state.current_track?.audio_file || state.current_track?.media_url || null;

        // Compute live position NOW (accounts for time elapsed since server response + latency)
        const livePos = calcLivePosition(state) + (state.is_playing ? rttSec : 0);

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

        // LISTENERS ONLY: apply play/pause/seek/speed sync
        // Hosts manage their own audio directly
        if (!isHostRef.current && audioRef.current) {
          const audio = audioRef.current;

          // 1) Track changed → hot-swap source
          if (newTrackUrl && loadedTrackUrlRef.current !== newTrackUrl) {
            loadedTrackUrlRef.current = newTrackUrl;
            audio.src = newTrackUrl;
            audio.load();
            autoplayBlockedRef.current = false;
            setAutoplayBlocked(false);
            return;
          }

          // 2) High-precision drift correction
          if (state.is_playing) {
            const diff = livePos - audio.currentTime; // Positive: listener behind; Negative: listener ahead
            const absDrift = Math.abs(diff);

            if (absDrift > 0.4 && !autoplayBlockedRef.current) {
              // Large drift (>400ms): hard seek to live position
              audio.currentTime = livePos;
              audio.playbackRate = 1.0;
            } else if (absDrift > 0.04 && !audio.paused) {
              // Small drift (40ms - 400ms): dynamically adjust playback rate to seamlessly catch up/slow down
              if (diff > 0) {
                // Listener is behind host -> speed up slightly (e.g. 1.03x to 1.05x)
                audio.playbackRate = Math.min(1.06, 1.0 + diff * 0.15);
              } else {
                // Listener is ahead of host -> slow down slightly (e.g. 0.95x to 0.97x)
                audio.playbackRate = Math.max(0.94, 1.0 + diff * 0.15);
              }
            } else {
              // In tight sync (<40ms drift): normal speed
              audio.playbackRate = 1.0;
            }
          } else {
            audio.playbackRate = 1.0;
          }

          // 3) Play/pause enforcement (guarded against autoplay frame loops)
          if (state.is_playing && audio.paused) {
            attemptPlayListener(audio, livePos);
          } else if (!state.is_playing && !audio.paused) {
            audio.pause();
            audio.currentTime = state.position_seconds; // anchor at exact pause point
            audio.playbackRate = 1.0;
          }
        }
      } catch (err) {
        console.warn('Sync poll error:', err);
      }
    }, 800);

    return () => clearInterval(syncInterval);
  }, [code, isSeeking, attemptPlayListener]);

  // Real-time timestamp ticker for listeners and joiners (updates UI every 250ms)
  useEffect(() => {
    const timer = setInterval(() => {
      if (isSeeking) return;
      if (audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
        setCurrentTime(audioRef.current.currentTime);
        if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
      } else if (roomRef.current) {
        const livePos = calcLivePosition(roomRef.current);
        setCurrentTime(livePos);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [isSeeking]);

  // Automatic 10-second Timestamp Auto-Adjuster for all connected users
  useEffect(() => {
    if (!code || isSeeking) return;

    const tenSecCheckInterval = setInterval(async () => {
      if (!isHostRef.current && audioRef.current && roomRef.current) {
        try {
          const freshState = await roomService.getRoomState(code);
          const livePos = calcLivePosition(freshState);
          const audio = audioRef.current;
          const drift = Math.abs(livePos - audio.currentTime);

          if (freshState.is_playing) {
            // Auto-adjust timestamp if drift is > 0.5s or if audio is paused while room is playing
            if (drift > 0.5 || audio.paused) {
              audio.currentTime = livePos;
              audio.play().catch(() => {});
            }
          } else if (!freshState.is_playing && !audio.paused) {
            audio.pause();
            audio.currentTime = freshState.position_seconds;
          }
        } catch (err) {
          console.warn('10-sec timestamp check error:', err);
        }
      }
    }, 10000);

    return () => clearInterval(tenSecCheckInterval);
  }, [code, isSeeking]);

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
    const pos = audioRef.current ? audioRef.current.currentTime : room.position_seconds;

    if (nextPlay) {
      audioRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
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

      // Host: update local audio element
      const newUrl = updated.current_track?.audio_file || updated.current_track?.media_url;
      if (newUrl && audioRef.current) {
        loadedTrackUrlRef.current = newUrl;
        audioRef.current.src = newUrl;
        audioRef.current.load();
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
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
  const trackAudioUrl = track?.audio_file || track?.media_url;
  const trackArtwork =
    track?.thumbnail ||
    track?.album?.images?.[0]?.url ||
    'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4';

  const inviteLink = `${window.location.origin}/room/${room.code}`;

  return (
    <div
      style={{
        height: '100%',
        minHeight: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0d281a 0%, #121212 280px)',
        color: '#ffffff',
        overflow: 'hidden',
        borderRadius: '8px',
        boxSizing: 'border-box',
      }}
    >
      {/* Hidden Audio Element for playback */}
      {trackAudioUrl && (
        <audio
          ref={audioRef}
          src={trackAudioUrl}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={async () => {
            const audio = audioRef.current;
            if (!audio) return;

            setDuration(audio.duration);
            loadedTrackUrlRef.current = trackAudioUrl;
            audio.volume = volume;

            // ─── Fetch FRESH state from server at the moment audio is ready ───
            try {
              const freshState = await roomService.getRoomState(code!);
              const livePos = calcLivePosition(freshState);

              if (freshState.is_playing) {
                if (isHostRef.current) {
                  audio.currentTime = livePos;
                  audio.play().catch(() => {});
                } else {
                  attemptPlayListener(audio, livePos);
                }
              } else {
                audio.pause();
                audio.currentTime = freshState.position_seconds;
              }
            } catch {
              const cachedRoom = roomRef.current;
              if (cachedRoom) {
                const livePos = calcLivePosition(cachedRoom);
                if (cachedRoom.is_playing) {
                  if (isHostRef.current) {
                    audio.currentTime = livePos;
                    audio.play().catch(() => {});
                  } else {
                    attemptPlayListener(audio, livePos);
                  }
                }
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
      )}

      {/* Top Header Bar */}
      <div
        style={{
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(18, 18, 18, 0.6)',
          backdropFilter: 'blur(10px)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/rooms')}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <FaArrowLeft size={14} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                {room.name}
              </h1>
              {/* Room Code Badge */}
              <button
                onClick={handleCopyCode}
                title='Click to copy code'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  cursor: 'pointer',
                }}
              >
                {copied ? <FaCheck size={11} /> : <FaCopy size={11} />}
                <span>{room.code}</span>
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
              Host: <strong style={{ color: '#ffffff' }}>{room.host_name}</strong>
              {room.description && ` • ${room.description}`}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* ── INVITE FRIENDS BUTTON ── */}
          <button
            onClick={() => setInviteOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
            }}
          >
            <FaUserPlus size={12} />
            <span>Invite Friends</span>
          </button>

          {isHost && (
            <button
              onClick={handleDeleteRoom}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <FaTrash size={12} />
              <span>End Room</span>
            </button>
          )}

          <button
            onClick={handleSyncAudio}
            title='Sync audio with live host timestamp'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; }}
          >
            <FaRotateRight size={12} />
            <span>Sync Audio</span>
          </button>

          <button
            onClick={handleLeaveRoom}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FaDoorOpen size={13} />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: Player Stage | Live Chat */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left: Synced Listening Stage */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            position: 'relative',
            overflowY: 'auto',
          }}
        >
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
              marginBottom: '28px',
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
                    background: '#10b981',
                    boxShadow: '0 0 10px #10b981',
                  }}
                />
                <span>Listening with {room.host_name} (In Sync)</span>
              </>
            )}
          </div>

          {/* Vinyl / Album Art */}
          <div
            style={{
              position: 'relative',
              width: '260px',
              height: '260px',
              marginBottom: '24px',
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

          {/* Track Info */}
          <div style={{ textAlign: 'center', marginBottom: '24px', maxWidth: '450px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#ffffff',
                margin: '0 0 6px 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {track?.title || track?.name || 'No Track Selected'}
            </h2>
            <span style={{ fontSize: '14px', color: '#a0a0a0' }}>
              {track?.youtube_channel?.name || track?.artists?.[0]?.name || 'Pick a song to start jam'}
            </span>
          </div>

          {/* Scrubber Progress Bar */}
          {(() => {
            const displayDuration =
              duration > 0
                ? duration
                : (track?.duration_seconds || (track?.duration_ms ? track.duration_ms / 1000 : 0));
            const displayCurrentTime = isSeeking
              ? seekValue
              : (currentTime > 0 ? currentTime : (room ? calcLivePosition(room) : 0));

            return (
              <div style={{ width: '100%', maxWidth: '500px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#a0a0a0', width: '38px', textAlign: 'right' }}>
                    {formatTime(displayCurrentTime)}
                  </span>
                  <input
                    type='range'
                    min={0}
                    max={displayDuration || 100}
                    step={0.5}
                    disabled={!isHost}
                    value={Math.min(displayCurrentTime, displayDuration || 100)}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekCommit}
                    onTouchEnd={handleSeekCommit}
                    style={{
                      flex: 1,
                      accentColor: '#10b981',
                      cursor: isHost ? 'pointer' : 'default',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#a0a0a0', width: '38px' }}>
                    {formatTime(displayDuration)}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Host Song Picker Button */}
            {isHost && (
              <button
                onClick={openSongPicker}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              >
                <FaMusic size={14} />
                <span>Change Track</span>
              </button>
            )}

            {/* Play/Pause Button */}
            {isHost ? (
              <button
                onClick={handleHostTogglePlay}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#10b981',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {room.is_playing ? <FaPause /> : <FaPlay style={{ marginLeft: '3px' }} />}
              </button>
            ) : (
              /* Listener view: read-only status, no playback control */
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    padding: '12px 20px',
                    borderRadius: '9999px',
                    background: room.is_playing
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(255, 255, 255, 0.06)',
                    border: room.is_playing
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid rgba(255,255,255,0.1)',
                    color: room.is_playing ? '#34d399' : '#a0a0a0',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 600,
                  }}
                >
                  {room.is_playing ? (
                    <>
                      {/* Animated bars to show active sync */}
                      <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '16px' }}>
                        {[1, 2, 3].map((i) => (
                          <span
                            key={i}
                            style={{
                              width: '3px',
                              borderRadius: '2px',
                              background: '#10b981',
                              animation: `bounce${i} 0.7s ease-in-out infinite alternate`,
                              height: `${6 + i * 3}px`,
                              display: 'inline-block',
                            }}
                          />
                        ))}
                      </span>
                      <span>Synced with Host</span>
                    </>
                  ) : (
                    <>
                      <FaPause size={13} />
                      <span>Host Paused — Waiting…</span>
                    </>
                  )}
                </div>

                <button
                  onClick={handleSyncAudio}
                  title='Click to re-sync audio with host if any error'
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; }}
                >
                  <FaRotateRight size={13} />
                  <span>Sync Audio</span>
                </button>

                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  🔒 Host controls playback
                </span>
              </div>
            )}

            {/* Volume Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  if (audioRef.current) {
                    const nextMuted = !muted;
                    setMuted(nextMuted);
                    audioRef.current.muted = nextMuted;
                  }
                }}
                style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer' }}
              >
                {muted || volume === 0 ? <FaVolumeXmark size={16} /> : <FaVolumeHigh size={16} />}
              </button>
              <input
                type='range'
                min={0}
                max={1}
                step={0.05}
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
              onClick={() => setInviteOpen(true)}
              style={{
                marginTop: '24px',
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
        <div
          style={{
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#151515',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
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
                            src={msg.avatar}
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
                        src={m.avatar}
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
                                  src={friend.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'}
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
