import React, { FC, memo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import {
  FaUserPlus, FaUserCheck, FaUserClock, FaUsers,
  FaMagnifyingGlass, FaCheck, FaXmark, FaCommentDots,
  FaHeart,
} from 'react-icons/fa6';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { socialService, UserSummary, FriendRequest } from '../../services/social';
import { normalizeMediaUrl } from '../../utils';

type Tab = 'search' | 'requests' | 'friends';

export const FriendsPage: FC = memo(() => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const [tab, setTab] = useState<Tab>('friends');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  const requireLogin = () => {
    if (!user || user.id === 'guest') {
      dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
      return true;
    }
    return false;
  };

  const loadFriends = useCallback(async () => {
    if (!user || user.id === 'guest') return;
    setLoading(true);
    try {
      const [f, r] = await Promise.all([
        socialService.getFriends(),
        socialService.getPendingRequests(),
      ]);
      setFriends(f);
      setRequests(r);
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await socialService.searchUsers(q);
      setSearchResults(res);
    } catch {} finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQ), 400);
    return () => clearTimeout(t);
  }, [searchQ, doSearch]);

  const sendRequest = async (userId: number) => {
    if (requireLogin()) return;
    setActionLoading((p) => ({ ...p, [userId]: true }));
    try {
      await socialService.sendRequest(userId);
      message.success('Friend request sent! 👋');
      setSearchResults((prev) =>
        prev.map((u) => u.id === userId ? { ...u, friend_status: 'pending_sent' } : u)
      );
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Failed to send request');
    } finally { setActionLoading((p) => ({ ...p, [userId]: false })); }
  };

  const respondRequest = async (requestId: number, action: 'accept' | 'reject') => {
    setActionLoading((p) => ({ ...p, [requestId]: true }));
    try {
      await socialService.respondToRequest(requestId, action);
      message.success(action === 'accept' ? 'Friend request accepted! 🎉' : 'Request rejected');
      await loadFriends();
    } catch {
      message.error('Action failed');
    } finally { setActionLoading((p) => ({ ...p, [requestId]: false })); }
  };

  const btn = (style?: React.CSSProperties) => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', borderRadius: '9999px', border: 'none',
    fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
    ...style,
  } as React.CSSProperties);

  const card = {
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,.08)',
    borderRadius: '14px', padding: '16px',
    display: 'flex', alignItems: 'center', gap: '14px',
  } as React.CSSProperties;

  const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  const getAvatarUrl = (url?: string) => {
    return normalizeMediaUrl(url, DEFAULT_AVATAR);
  };

  const renderUserCard = (u: UserSummary) => (
    <div key={u.id} style={card}>
      <img
        src={getAvatarUrl(u.avatar)} alt={u.display_name}
        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{u.display_name}</div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>@{u.username}</div>
      </div>
      {u.friend_status === 'none' && (
        <button
          style={btn({ background: '#10b981', color: '#000' })}
          onClick={() => sendRequest(u.id)}
          disabled={actionLoading[u.id]}
        >
          {actionLoading[u.id] ? <Spin size="small" /> : <><FaUserPlus size={12} /><span>Add Friend</span></>}
        </button>
      )}
      {u.friend_status === 'pending_sent' && (
        <div style={btn({ background: 'rgba(255,255,255,.08)', color: '#a0a0a0', cursor: 'default' })}>
          <FaUserClock size={12} /><span>Pending</span>
        </div>
      )}
      {u.friend_status === 'pending_received' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btn({ background: '#10b981', color: '#000' })} onClick={() => respondRequest(u.request_id!, 'accept')}>
            <FaCheck size={12} /><span>Accept</span>
          </button>
          <button style={btn({ background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' })} onClick={() => respondRequest(u.request_id!, 'reject')}>
            <FaXmark size={12} />
          </button>
        </div>
      )}
      {u.friend_status === 'friends' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btn({ background: 'rgba(16,185,129,.15)', color: '#34d399', border: '1px solid rgba(16,185,129,.3)' })} onClick={() => navigate(`/messages/${u.id}`)}>
            <FaCommentDots size={12} /><span>Message</span>
          </button>
          <div style={btn({ background: 'rgba(255,255,255,.06)', color: '#a0a0a0', cursor: 'default' })}>
            <FaUserCheck size={12} /><span>Friends</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderFriendCard = (u: UserSummary) => (
    <div key={u.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/messages/${u.id}`)}>
      <div style={{ position: 'relative' }}>
        <img
          src={getAvatarUrl(u.avatar)} alt={u.display_name}
          onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
          style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
        />
        {(u.unread_messages || 0) > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#10b981', color: '#000', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {u.unread_messages}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{u.display_name}</div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>@{u.username}</div>
      </div>
      <button style={btn({ background: '#10b981', color: '#000' })} onClick={(e) => { e.stopPropagation(); navigate(`/messages/${u.id}`); }}>
        <FaCommentDots size={12} /><span>Message</span>
      </button>
    </div>
  );

  const renderRequestCard = (fr: FriendRequest) => (
    <div key={fr.id} style={card}>
      <img
        src={getAvatarUrl(fr.sender.avatar)} alt={fr.sender.display_name}
        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{fr.sender.display_name}</div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>@{fr.sender.username} wants to be your friend</div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          style={btn({ background: '#10b981', color: '#000' })}
          disabled={actionLoading[fr.id]}
          onClick={() => respondRequest(fr.id, 'accept')}
        >
          {actionLoading[fr.id] ? <Spin size="small" /> : <><FaCheck size={12} /><span>Accept</span></>}
        </button>
        <button
          style={btn({ background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' })}
          onClick={() => respondRequest(fr.id, 'reject')}
        >
          <FaXmark size={12} /><span>Decline</span>
        </button>
      </div>
    </div>
  );

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: '9999px', border: 'none',
    background: active ? '#10b981' : 'rgba(255,255,255,.06)',
    color: active ? '#000' : '#a0a0a0',
    fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all .2s',
    display: 'flex', alignItems: 'center', gap: '8px',
  });

  return (
    <div style={{ height: '100%', minHeight: '100%', flex: 1, padding: '24px 32px 24px', color: '#fff', background: 'linear-gradient(180deg,#0d1f2d 0%,#121212 300px)', overflowY: 'auto', borderRadius: '8px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <FaHeart color="#10b981" size={20} />
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Friends</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Connect with friends, send messages, and listen together</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button style={TAB_STYLE(tab === 'friends')} onClick={() => setTab('friends')}>
          <FaUserCheck size={13} /><span>My Friends ({friends.length})</span>
        </button>
        <button style={TAB_STYLE(tab === 'requests')} onClick={() => setTab('requests')}>
          <FaUserClock size={13} />
          <span>Requests</span>
          {requests.length > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: '9999px', padding: '1px 7px', fontSize: '11px' }}>
              {requests.length}
            </span>
          )}
        </button>
        <button style={TAB_STYLE(tab === 'search')} onClick={() => setTab('search')}>
          <FaMagnifyingGlass size={13} /><span>Find People</span>
        </button>
      </div>

      {/* Search tab */}
      {tab === 'search' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
            <FaMagnifyingGlass color="#6b7280" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by username or name..."
              autoFocus
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
            {searching && <Spin size="small" />}
          </div>
          {searchQ && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {searchResults.length === 0 && !searching && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#4b5563' }}>
                  <FaUsers size={32} style={{ marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
                  <div>No users found for "{searchQ}"</div>
                </div>
              )}
              {searchResults.map(renderUserCard)}
            </div>
          )}
          {!searchQ && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4b5563' }}>
              <FaMagnifyingGlass size={40} style={{ marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Find your friends</div>
              <div style={{ fontSize: '13px' }}>Search by username to find and add friends</div>
            </div>
          )}
        </div>
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        <div>
          {loading ? <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div> :
            requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#4b5563' }}>
                <FaUserClock size={40} style={{ marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
                <div>No pending friend requests</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requests.map(renderRequestCard)}
              </div>
            )
          }
        </div>
      )}

      {/* Friends tab */}
      {tab === 'friends' && (
        <div>
          {loading ? <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div> :
            friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#4b5563' }}>
                <FaUsers size={40} style={{ marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No friends yet</div>
                <div style={{ fontSize: '13px', marginBottom: '20px' }}>Search for people to add as friends</div>
                <button style={{ ...btn({ background: '#10b981', color: '#000', padding: '10px 24px', fontSize: '13px' }) }} onClick={() => setTab('search')}>
                  <FaMagnifyingGlass size={13} /><span>Find People</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {friends.map(renderFriendCard)}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
});

FriendsPage.displayName = 'FriendsPage';
