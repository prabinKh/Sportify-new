import React, { FC, memo, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import { 
  FaRadio, 
  FaPlus, 
  FaUsers, 
  FaPlay, 
  FaPause, 
  FaMagnifyingGlass, 
  FaArrowRight, 
  FaLock, 
  FaGlobe,
  FaMusic
} from 'react-icons/fa6';

// Redux & Services
import { useAppDispatch, useAppSelector } from '../../store/store';
import { uiActions } from '../../store/slices/ui';
import { roomService, RoomData } from '../../services/rooms';
import { CreateRoomModal } from '../../components/Modals/CreateRoomModal';

export const RoomsPage: FC = memo(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadRooms = async () => {
    try {
      const data = await roomService.getRooms(search);
      setRooms(data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 8000);
    return () => clearInterval(interval);
  }, [search]);

  const handleJoinByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!user || user.id === 'guest') {
      return dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
    }

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      return message.warning('Please enter a 6-character room code.');
    }

    setJoining(true);
    try {
      const room = await roomService.joinRoom(code);
      message.success(`Joined room "${room.name}"!`);
      navigate(`/room/${room.code}`);
    } catch (err: any) {
      const serverErr = err?.response?.data?.error || 'Room not found. Please check the code.';
      message.error(serverErr);
    } finally {
      setJoining(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!user || user.id === 'guest') {
      return dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
    }
    setCreateModalOpen(true);
  };

  return (
    <div
      style={{
        height: '100%',
        minHeight: '100%',
        flex: 1,
        padding: '24px 32px 100px',
        color: '#ffffff',
        background: 'linear-gradient(180deg, #132f22 0%, #121212 320px)',
        overflowY: 'auto',
        borderRadius: '8px',
        boxSizing: 'border-box',
      }}
    >
      {/* Hero Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                display: 'inline-block',
              }}
            />
            ListenTogether
          </div>
        </div>

        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            letterSpacing: '-1px',
            margin: '0 0 10px 0',
            color: '#ffffff',
          }}
        >
          Live Jam Rooms 🎧
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: '#b3b3b3',
            maxWidth: '650px',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Stream synchronized music with friends in real time. Create your own listening party or join public jam rooms.
        </p>
      </div>

      {/* Action Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '32px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px 20px',
        }}
      >
        {/* Left: Create Room Button */}
        <button
          onClick={handleOpenCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 24px',
            borderRadius: '9999px',
            border: 'none',
            background: '#10b981',
            color: '#000000',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.04)';
            e.currentTarget.style.background = '#34d399';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = '#10b981';
          }}
        >
          <FaPlus size={14} />
          <span>Start a Jam Room</span>
        </button>

        {/* Center/Right: Join by Code & Search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* Join by Code Input */}
          <form
            onSubmit={handleJoinByCode}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#181818',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '4px 6px 4px 16px',
            }}
          >
            <input
              type='text'
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder='Enter 6-char code...'
              maxLength={10}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '1px',
                outline: 'none',
                width: '150px',
              }}
            />
            <button
              type='submit'
              disabled={joining || !joinCode.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: joinCode.trim() ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
                color: '#000000',
                fontSize: '12px',
                fontWeight: 700,
                cursor: joinCode.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              <span>Join</span>
              <FaArrowRight size={10} />
            </button>
          </form>

          {/* Search Rooms Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#181818',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '8px 16px',
              minWidth: '200px',
            }}
          >
            <FaMagnifyingGlass size={13} color='#a0a0a0' />
            <input
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search rooms or hosts...'
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
        </div>
      </div>

      {/* Public Rooms Grid */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Active Jam Rooms ({rooms.length})
          </h2>
          <span style={{ fontSize: '13px', color: '#a0a0a0' }}>Auto-refreshing live</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size='large' />
            <p style={{ marginTop: '16px', color: '#a0a0a0' }}>Discovering live jam sessions...</p>
          </div>
        ) : rooms.length === 0 ? (
          /* Empty state */
          <div
            style={{
              textAlign: 'center',
              padding: '64px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                fontSize: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <FaRadio />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              No active jam rooms right now
            </h3>
            <p style={{ color: '#a0a0a0', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
              Be the first to create a listening room and invite your friends to listen along!
            </p>
            <button
              onClick={handleOpenCreateModal}
              style={{
                padding: '12px 24px',
                borderRadius: '9999px',
                border: 'none',
                background: '#10b981',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Start First Jam Room
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {rooms.map((room) => {
              const trackThumbnail =
                room.current_track?.thumbnail ||
                room.current_track?.album?.images?.[0]?.url ||
                'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4';

              return (
                <div
                  key={room.id}
                  onClick={() => navigate(`/room/${room.code}`)}
                  style={{
                    background: '#181818',
                    borderRadius: '14px',
                    padding: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    {/* Top row: Code badge & Live listener count */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px',
                      }}
                    >
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                        }}
                      >
                        CODE: {room.code}
                      </span>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: '#a0a0a0',
                        }}
                      >
                        <FaUsers size={12} color='#10b981' />
                        <span>{room.member_count} listening</span>
                      </div>
                    </div>

                    {/* Room Title */}
                    <h3
                      style={{
                        fontSize: '17px',
                        fontWeight: 700,
                        margin: '0 0 6px 0',
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {room.name}
                    </h3>

                    {/* Host info */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <img
                        src={room.host_avatar?.startsWith('/media/') ? `http://127.0.0.1:8000${room.host_avatar}` : (room.host_avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png')}
                        alt={room.host_name}
                        onError={(e) => { e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; }}
                        style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontSize: '13px', color: '#b3b3b3' }}>
                        Host: <strong style={{ color: '#ffffff' }}>{room.host_name}</strong>
                      </span>
                    </div>

                    {/* Currently Playing Card */}
                    <div
                      style={{
                        background: '#242424',
                        borderRadius: '10px',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '16px',
                      }}
                    >
                      <img
                        src={trackThumbnail}
                        alt=''
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '11px',
                            color: room.is_playing ? '#10b981' : '#a0a0a0',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '2px',
                          }}
                        >
                          {room.is_playing ? '▶ Now Playing' : '⏸ Paused'}
                        </span>
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
                          {room.current_track?.title || room.current_track?.name || 'No song selected'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Join Room Button */}
                  <button
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#10b981';
                      e.currentTarget.style.color = '#000000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                  >
                    <span>Join Session</span>
                    <FaArrowRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateRoomModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(code) => navigate(`/room/${code}?invite=true`)}
      />
    </div>
  );
});

RoomsPage.displayName = 'RoomsPage';
