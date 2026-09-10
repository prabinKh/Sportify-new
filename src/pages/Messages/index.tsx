import React, { FC, memo, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { FaPaperPlane, FaArrowLeft, FaUserPlus, FaUsers, FaCommentDots, FaMusic, FaPlay } from 'react-icons/fa6';
import { useAppSelector } from '../../store/store';
import { socialService, UserSummary, DirectMessage } from '../../services/social';

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
};

const extractRoomInvite = (text: string) => {
  if (!text) return null;
  const trimmed = text.trim();
  // Support standalone 6-character room codes (e.g. DFWXHS, XNXVAX)
  if (/^[A-Za-z0-9]{6}$/.test(trimmed)) {
    return { roomCode: trimmed.toUpperCase(), roomName: 'Live Jam Room' };
  }
  const match = text.match(/\/room\/([a-zA-Z0-9]{4,12})/i) || text.match(/Code:\s*([a-zA-Z0-9]{4,12})/i);
  if (!match) return null;
  const roomCode = match[1].toUpperCase();
  const nameMatch = text.match(/room ["'“]([^"'“”]+)["'”]/i);
  const roomName = nameMatch ? nameMatch[1] : 'Live Jam Room';
  return { roomCode, roomName };
};

export const MessagesPage: FC = memo(() => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const currentUser = useAppSelector((s) => s.auth.user);

  const [conversations, setConversations] = useState<UserSummary[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [activeConvo, setActiveConvo] = useState<UserSummary | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const c = await socialService.getConversations();
      setConversations(c);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Open conversation from URL param (guarded to prevent infinite re-render loop)
  useEffect(() => {
    if (userId && conversations.length > 0) {
      const targetId = parseInt(userId, 10);
      if (!isNaN(targetId) && activeConvo?.id !== targetId) {
        const found = conversations.find((c) => c.id === targetId);
        if (found) {
          setActiveConvo(found);
          socialService.getMessages(found.id).then((msgs) => {
            setMessages(msgs);
            setConversations((prev) =>
              prev.map((c) => (c.id === found.id ? { ...c, unread_count: 0 } : c))
            );
          }).catch(() => {});
        }
      }
    }
  }, [userId, conversations, activeConvo?.id]);

  const openConversation = useCallback(async (friend: UserSummary) => {
    if (activeConvo?.id === friend.id) return;
    setActiveConvo(friend);
    navigate(`/messages/${friend.id}`, { replace: true });
    try {
      const msgs = await socialService.getMessages(friend.id);
      setMessages(msgs);
      setConversations((prev) =>
        prev.map((c) => (c.id === friend.id ? { ...c, unread_count: 0 } : c))
      );
    } catch {}
  }, [activeConvo?.id, navigate]);

  // Poll for new messages every 3 seconds when chat is open (only update state if messages actually change)
  useEffect(() => {
    if (!activeConvo) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await socialService.getMessages(activeConvo.id);
        setMessages((prev) => {
          if (prev.length === msgs.length && prev.map(m => m.id).join() === msgs.map(m => m.id).join()) {
            return prev; // No change -> preserve reference to avoid unnecessary re-renders
          }
          return msgs;
        });
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [activeConvo?.id]);

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = newMsg.trim();
    if (!text || !activeConvo || sending) return;
    setSending(true);
    try {
      const msg = await socialService.sendMessage(activeConvo.id, text);
      setMessages((prev) => [...prev, msg]);
      setNewMsg('');
    } catch {} finally { setSending(false); }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, DirectMessage[]>);

  const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  const getAvatarUrl = (url?: string) => {
    if (!url) return DEFAULT_AVATAR;
    if (url.startsWith('/media/')) return `http://127.0.0.1:8000${url}`;
    return url;
  };

  const sidebarStyle: React.CSSProperties = {
    width: 280, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,.08)',
    display: 'flex', flexDirection: 'column', background: '#111',
  };
  const mainStyle: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
  };

  return (
    <div style={{ height: '100%', minHeight: '100%', flex: 1, display: 'flex', color: '#fff', background: '#0f0f0f', overflow: 'hidden', borderRadius: '8px', boxSizing: 'border-box' }}>

      {/* Left sidebar — conversation list */}
      <div style={sidebarStyle}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Messages</h2>
            <button
              onClick={() => navigate('/friends')}
              style={{ background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', color: '#34d399', borderRadius: '9999px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FaUserPlus size={10} /><span>Add</span>
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#4b5563', margin: 0 }}>Friends only</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4b5563' }}>
              <FaUsers size={32} style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '13px', marginBottom: '12px' }}>No conversations yet</div>
              <button onClick={() => navigate('/friends')} style={{ background: '#10b981', color: '#000', border: 'none', borderRadius: '9999px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Find Friends
              </button>
            </div>
          ) : (
            conversations.map((convo) => {
              const isActive = activeConvo?.id === convo.id;
              return (
                <div
                  key={convo.id}
                  onClick={() => openConversation(convo)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 10px', borderRadius: '10px',
                    background: isActive ? 'rgba(16,185,129,.12)' : 'transparent',
                    border: isActive ? '1px solid rgba(16,185,129,.3)' : '1px solid transparent',
                    cursor: 'pointer', marginBottom: '2px', transition: 'all .2s',
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={getAvatarUrl(convo.avatar)} alt=""
                      onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    {(convo.unread_count || 0) > 0 && (
                      <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#10b981', color: '#000', fontSize: '9px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {convo.unread_count}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {convo.display_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {convo.last_message ? convo.last_message.text : '@' + convo.username}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right — chat panel */}
      <div style={mainStyle}>
        {!activeConvo ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#4b5563' }}>
            <FaCommentDots size={48} />
            <div style={{ fontSize: '18px', fontWeight: 700 }}>Select a conversation</div>
            <div style={{ fontSize: '13px' }}>Choose a friend from the left to start chatting</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(18,18,18,.8)', backdropFilter: 'blur(10px)' }}>
              <button onClick={() => { setActiveConvo(null); navigate('/messages'); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}>
                <FaArrowLeft />
              </button>
              <img
                src={getAvatarUrl(activeConvo.avatar)} alt=""
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{activeConvo.display_name}</div>
                <div style={{ fontSize: '11px', color: '#10b981' }}>🔒 Friends only chat</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div style={{ textAlign: 'center', fontSize: '11px', color: '#4b5563', margin: '12px 0 8px', fontWeight: 600 }}>{date}</div>
                  {msgs.map((msg) => {
                    const isMine = String(msg.sender.id) === String(currentUser?.id);
                    const roomInvite = extractRoomInvite(msg.text);

                    // Render text with clickable links
                    const renderTextWithLinks = (text: string) => {
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const parts = text.split(urlRegex);
                      return parts.map((part, i) => {
                        if (part.match(urlRegex)) {
                          const linkRoom = part.match(/\/room\/([a-zA-Z0-9]+)/i);
                          return (
                            <a
                              key={i}
                              href={part}
                              onClick={(e) => {
                                if (linkRoom) {
                                  e.preventDefault();
                                  navigate(`/room/${linkRoom[1]}`);
                                }
                              }}
                              style={{
                                color: isMine ? '#000' : '#34d399',
                                textDecoration: 'underline',
                                fontWeight: 700,
                                wordBreak: 'break-all',
                              }}
                            >
                              {part}
                            </a>
                          );
                        }
                        return <span key={i}>{part}</span>;
                      });
                    };

                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '6px' }}>
                        {!isMine && (
                          <img
                            src={getAvatarUrl(msg.sender.avatar)} alt=""
                            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginRight: '8px', flexShrink: 0, alignSelf: 'flex-end' }}
                          />
                        )}
                        <div
                          style={{
                            maxWidth: '70%', padding: '10px 14px',
                            borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isMine ? '#10b981' : '#242424',
                            color: isMine ? '#000' : '#fff',
                            fontSize: '14px', lineHeight: 1.4, wordBreak: 'break-word',
                          }}
                        >
                          <div style={{ whiteSpace: 'pre-wrap' }}>
                            {renderTextWithLinks(msg.text)}
                          </div>

                          {/* Interactive Jam Room Invite Card */}
                          {roomInvite && (
                            <div
                              style={{
                                marginTop: '10px',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: isMine ? 'rgba(0,0,0,0.18)' : '#171717',
                                border: isMine ? '1px solid rgba(0,0,0,0.25)' : '1px solid rgba(16,185,129,0.35)',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isMine ? '#000' : '#34d399', fontWeight: 800, fontSize: '12px' }}>
                                  <FaMusic size={12} />
                                  <span>Jam Room Invite</span>
                                </div>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.8px',
                                    background: isMine ? 'rgba(0,0,0,0.15)' : 'rgba(16,185,129,0.15)',
                                    color: isMine ? '#000' : '#34d399',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {roomInvite.roomCode}
                                </span>
                              </div>

                              <div style={{ fontSize: '13px', fontWeight: 700, color: isMine ? '#000' : '#fff' }}>
                                {roomInvite.roomName}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/room/${roomInvite.roomCode}`);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '7px',
                                  width: '100%',
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: isMine ? '#000' : '#10b981',
                                  color: isMine ? '#fff' : '#000',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                }}
                              >
                                <FaPlay size={10} />
                                <span>Join Room Automatically 🎧</span>
                              </button>
                            </div>
                          )}

                          <div style={{ fontSize: '10px', color: isMine ? 'rgba(0,0,0,.5)' : '#4b5563', marginTop: '4px', textAlign: 'right' }}>
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#4b5563', fontSize: '13px' }}>
                  No messages yet — say hi! 👋
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: '10px', alignItems: 'center', background: '#111' }}>
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder={`Message ${activeConvo.display_name}...`}
                style={{ flex: 1, background: '#1a1a1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: '9999px', padding: '11px 18px', color: '#fff', fontSize: '14px', outline: 'none' }}
              />
              <button
                type="submit"
                disabled={!newMsg.trim() || sending}
                style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: newMsg.trim() ? '#10b981' : 'rgba(255,255,255,.08)', color: newMsg.trim() ? '#000' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMsg.trim() ? 'pointer' : 'not-allowed', transition: 'all .2s' }}
              >
                {sending ? <Spin size="small" /> : <FaPaperPlane size={16} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
});

MessagesPage.displayName = 'MessagesPage';
