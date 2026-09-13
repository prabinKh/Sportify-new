import React, { FC, memo, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { FaPaperPlane, FaArrowLeft, FaUserPlus, FaUsers, FaCommentDots, FaMusic, FaPlay } from 'react-icons/fa6';
import { useAppSelector } from '../../store/store';
import { socialService, UserSummary, DirectMessage } from '../../services/social';
import { normalizeMediaUrl } from '../../utils';

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
    return normalizeMediaUrl(url, DEFAULT_AVATAR);
  };

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  return (
    <div className='messages-page-wrapper'>
      {/* Left sidebar — conversation list */}
      <aside className={`messages-sidebar ${activeConvo ? 'mobile-hidden' : ''}`}>
        <div className='messages-sidebar-header'>
          <div>
            <h2 className='messages-sidebar-header__title'>Messages</h2>
            <p className='messages-sidebar-header__subtitle'>Friends only chat</p>
          </div>
          <button
            type='button'
            onClick={() => navigate('/friends')}
            style={{
              background: 'rgba(16,185,129,.15)',
              border: '1px solid rgba(16,185,129,.35)',
              color: '#34d399',
              borderRadius: '9999px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s',
            }}
          >
            <FaUserPlus size={11} />
            <span>Find Friends</span>
          </button>
        </div>

        <div className='messages-sidebar-list'>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717a' }}>
              <FaUsers size={36} style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px', opacity: 0.6 }} />
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#a1a1aa', marginBottom: '8px' }}>No conversations yet</div>
              <p style={{ fontSize: '12px', color: '#71717a', marginBottom: '16px' }}>Add friends to start chatting and sharing jam rooms!</p>
              <button
                type='button'
                onClick={() => navigate('/friends')}
                style={{
                  background: '#10b981',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '9px 18px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Explore Friends
              </button>
            </div>
          ) : (
            conversations.map((convo) => {
              const isActive = activeConvo?.id === convo.id;
              return (
                <div
                  key={convo.id}
                  onClick={() => openConversation(convo)}
                  className={`conversation-item ${isActive ? 'is-active' : ''}`}
                >
                  <div className='conversation-item__avatar-wrapper'>
                    <img
                      src={getAvatarUrl(convo.avatar)}
                      alt=''
                      onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      className='conversation-item__avatar'
                    />
                    {(convo.unread_count || 0) > 0 && (
                      <div className='conversation-item__badge'>
                        {convo.unread_count}
                      </div>
                    )}
                  </div>
                  <div className='conversation-item__info'>
                    <div className='conversation-item__name'>
                      {convo.display_name}
                    </div>
                    <div className='conversation-item__preview'>
                      {convo.last_message ? convo.last_message.text : '@' + convo.username}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Right — chat panel */}
      <main className={`messages-main ${!activeConvo ? 'mobile-hidden' : ''}`}>
        {!activeConvo ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', color: '#71717a', padding: '24px' }}>
            <FaCommentDots size={48} style={{ opacity: 0.5 }} />
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>Select a conversation</div>
            <div style={{ fontSize: '13px', color: '#a1a1aa' }}>Choose a friend from the left to start chatting</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className='messages-chat-header'>
              <button
                type='button'
                onClick={() => { setActiveConvo(null); navigate('/messages'); }}
                className='messages-chat-header__back-btn'
                aria-label='Back to conversations'
              >
                <FaArrowLeft size={13} />
              </button>
              <img
                src={getAvatarUrl(activeConvo.avatar)}
                alt=''
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                className='messages-chat-header__avatar'
              />
              <div className='messages-chat-header__info'>
                <div className='messages-chat-header__name'>{activeConvo.display_name}</div>
                <div className='messages-chat-header__status'>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span>Friends only chat</span>
                </div>
              </div>
            </div>

            {/* Messages Stream */}
            <div className='messages-stream'>
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className='date-separator'>
                    <span>{date}</span>
                  </div>
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
                                color: isMine ? '#000000' : '#34d399',
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
                      <div
                        key={msg.id}
                        className={`message-row ${isMine ? 'message-row--me' : 'message-row--them'}`}
                      >
                        {!isMine && (
                          <img
                            src={getAvatarUrl(msg.sender.avatar)}
                            alt=''
                            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                            className='message-sender-avatar'
                          />
                        )}
                        <div
                          className={`message-bubble ${isMine ? 'message-bubble--me' : 'message-bubble--them'}`}
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
                                background: isMine ? 'rgba(0,0,0,0.2)' : '#18181b',
                                border: isMine ? '1px solid rgba(0,0,0,0.3)' : '1px solid rgba(16,185,129,0.35)',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isMine ? '#000000' : '#34d399', fontWeight: 800, fontSize: '12px' }}>
                                  <FaMusic size={12} />
                                  <span>Live Jam Invite</span>
                                </div>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.8px',
                                    background: isMine ? 'rgba(0,0,0,0.18)' : 'rgba(16,185,129,0.18)',
                                    color: isMine ? '#000000' : '#34d399',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {roomInvite.roomCode}
                                </span>
                              </div>

                              <div style={{ fontSize: '13px', fontWeight: 700, color: isMine ? '#000000' : '#ffffff' }}>
                                {roomInvite.roomName}
                              </div>

                              <button
                                type='button'
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
                                  background: isMine ? '#000000' : '#10b981',
                                  color: isMine ? '#ffffff' : '#000000',
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

                          <div className='message-bubble__time'>
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#71717a', fontSize: '13px' }}>
                  No messages yet — say hi! 👋
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={sendMessage} className='message-input-form'>
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder={`Message ${activeConvo.display_name}...`}
              />
              <button
                type="submit"
                disabled={!newMsg.trim() || sending}
                aria-label='Send message'
              >
                {sending ? <Spin size="small" /> : <FaPaperPlane size={15} />}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
});

MessagesPage.displayName = 'MessagesPage';

