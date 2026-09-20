import { FC, memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaListUl, FaMicrophone, FaUserCheck, FaUsers, FaCommentDots, FaRadio, FaChevronDown } from 'react-icons/fa6';
import { Space } from 'antd';

interface NavbarQuickLinksProps {
  isMobile?: boolean;
}

export const NavbarQuickLinks: FC<NavbarQuickLinksProps> = memo(({ isMobile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [socialOpen, setSocialOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  const isPlaylistsActive =
    location.pathname === '/playlist' || location.pathname === '/playlists';

  const isFollowingActive =
    (location.pathname === '/artists' || location.pathname.includes('/artists')) &&
    location.search.includes('filter=following');

  const isArtistsActive =
    (location.pathname === '/artists' || location.pathname.includes('/artists')) &&
    !isFollowingActive;

  const isFriendsActive = location.pathname === '/friends';
  const isMessagesActive = location.pathname.startsWith('/messages');
  const isRoomsActive = location.pathname.startsWith('/rooms');
  const isSocialActive = isFriendsActive || isMessagesActive || isRoomsActive;

  // Calculate dropdown position when opening
  useEffect(() => {
    if (socialOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [socialOpen]);

  // Close dropdown on outside click (check both button and floating dropdown)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideButton = buttonRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideButton && !insideDropdown) {
        setSocialOpen(false);
      }
    };
    if (socialOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [socialOpen]);

  // Close when navigating
  useEffect(() => {
    setSocialOpen(false);
  }, [location.pathname]);

  const getButtonStyle = (isActive: boolean, activeColor = '#ffffff') => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '7px 15px',
    borderRadius: '9999px',
    border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.14)',
    background: isActive ? activeColor : 'rgba(255, 255, 255, 0.08)',
    color: isActive ? '#000000' : '#d1d5db',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isActive ? '0 2px 10px rgba(0, 0, 0, 0.25)' : 'none',
    whiteSpace: 'nowrap' as const,
  });

  const hoverIn = (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => {
    if (!isActive) {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
      e.currentTarget.style.color = '#ffffff';
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
    }
  };
  const hoverOut = (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => {
    if (!isActive) {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
      e.currentTarget.style.color = '#d1d5db';
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
    }
  };

  const socialItems = [
    { key: 'friends', label: 'Friends', icon: <FaUsers size={14} />, color: '#f59e0b', path: '/friends', isActive: isFriendsActive },
    { key: 'messages', label: 'Messages', icon: <FaCommentDots size={14} />, color: '#3b82f6', path: '/messages', isActive: isMessagesActive },
    { key: 'rooms', label: 'Live Rooms', icon: <FaRadio size={14} />, color: '#10b981', path: '/rooms', isActive: isRoomsActive, hasLiveDot: true },
  ];

  return (
    <div className='navbar-quick-links' style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
      <Space size={8} direction={isMobile ? 'vertical' : 'horizontal'}>
        {/* Playlists Button */}
        <button
          onClick={() => navigate('/playlist')}
          style={getButtonStyle(isPlaylistsActive, '#10b981')}
          onMouseEnter={(e) => hoverIn(e, isPlaylistsActive)}
          onMouseLeave={(e) => hoverOut(e, isPlaylistsActive)}
          title='View all playlists'
        >
          <FaListUl size={12} />
          <span>Playlists</span>
        </button>

        {/* Artists Button */}
        <button
          onClick={() => navigate('/artists?filter=all')}
          style={getButtonStyle(isArtistsActive, '#ffffff')}
          onMouseEnter={(e) => hoverIn(e, isArtistsActive)}
          onMouseLeave={(e) => hoverOut(e, isArtistsActive)}
          title='View all artists'
        >
          <FaMicrophone size={12} />
          <span>Artists</span>
        </button>

        {/* Following Button */}
        <button
          onClick={() => navigate('/artists?filter=following')}
          style={getButtonStyle(isFollowingActive, '#22c55e')}
          onMouseEnter={(e) => hoverIn(e, isFollowingActive)}
          onMouseLeave={(e) => hoverOut(e, isFollowingActive)}
          title='View followed artists'
        >
          <FaUserCheck size={12} />
          <span>Following</span>
        </button>

        {/* Social Links — Flattened on mobile, Dropdown on desktop */}
        {isMobile ? (
          <>
            {socialItems.map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                style={getButtonStyle(item.isActive, item.color)}
                onMouseEnter={(e) => hoverIn(e, item.isActive)}
                onMouseLeave={(e) => hoverOut(e, item.isActive)}
              >
                <span style={{ color: item.isActive ? '#000' : item.color }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </>
        ) : (
          <div style={{ position: 'relative' }}>
            <button
              ref={buttonRef}
              onClick={() => setSocialOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 15px',
                borderRadius: '9999px',
                border: isSocialActive
                  ? 'none'
                  : socialOpen
                  ? '1px solid rgba(139, 92, 246, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.14)',
                background: isSocialActive
                  ? (isFriendsActive ? '#f59e0b' : isMessagesActive ? '#3b82f6' : '#10b981')
                  : socialOpen
                  ? 'rgba(139, 92, 246, 0.18)'
                  : 'rgba(255, 255, 255, 0.08)',
                color: isSocialActive ? '#000000' : socialOpen ? '#c4b5fd' : '#d1d5db',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSocialActive ? '0 2px 10px rgba(0, 0, 0, 0.25)' : 'none',
                whiteSpace: 'nowrap' as const,
              }}
              onMouseEnter={(e) => {
                if (!isSocialActive && !socialOpen) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                  e.currentTarget.style.color = '#c4b5fd';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSocialActive && !socialOpen) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#d1d5db';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                }
              }}
              title='Social — Friends, Messages, Live Rooms'
            >
              {/* Show active page icon or default */}
              {isFriendsActive ? <FaUsers size={12} /> : isMessagesActive ? <FaCommentDots size={12} /> : isRoomsActive ? <FaRadio size={12} /> : <FaUsers size={12} />}
              <span>{isFriendsActive ? 'Friends' : isMessagesActive ? 'Messages' : isRoomsActive ? 'Live Rooms' : 'Social'}</span>
              <FaChevronDown
                size={9}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: socialOpen ? 'rotate(180deg)' : 'rotate(0)',
                  opacity: 0.7,
                }}
              />
            </button>

            {/* Dropdown menu — rendered as a portal to escape overflow:hidden parents */}
            {socialOpen && dropdownPos && createPortal(
              <div
                ref={dropdownRef}
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  right: dropdownPos.right,
                  minWidth: '200px',
                  padding: '6px',
                  borderRadius: '10px',
                  background: '#282828',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 16px 32px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 99999,
                  animation: 'socialDropdownIn 0.15s ease-out',
                }}
              >
                {socialItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      navigate(item.path);
                      setSocialOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: item.isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: item.isActive ? item.color : '#d1d5db',
                      fontSize: '14px',
                      fontWeight: item.isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.color = item.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = item.isActive ? 'rgba(255,255,255,0.1)' : 'transparent';
                      e.currentTarget.style.color = item.isActive ? item.color : '#d1d5db';
                    }}
                  >
                    <span style={{ color: item.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.hasLiveDot && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: item.color,
                            boxShadow: `0 0 6px ${item.color}`,
                            display: 'inline-block',
                          }}
                        />
                      )}
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.isActive && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: item.color,
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
        )}
      </Space>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes socialDropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
});

NavbarQuickLinks.displayName = 'NavbarQuickLinks';

export default NavbarQuickLinks;
