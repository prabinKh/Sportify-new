import { FC, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaListUl, FaMicrophone, FaUserCheck } from 'react-icons/fa6';
import { Space } from 'antd';

export const NavbarQuickLinks: FC = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();

  const isPlaylistsActive =
    location.pathname === '/playlist' || location.pathname === '/playlists';

  const isFollowingActive =
    (location.pathname === '/artists' || location.pathname.includes('/artists')) &&
    location.search.includes('filter=following');

  const isArtistsActive =
    (location.pathname === '/artists' || location.pathname.includes('/artists')) &&
    !isFollowingActive;

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

  return (
    <div className='navbar-quick-links' style={{ display: 'flex', alignItems: 'center' }}>
      <Space size={8}>
        {/* Playlists Button */}
        <button
          onClick={() => navigate('/playlist')}
          style={getButtonStyle(isPlaylistsActive, '#10b981')}
          onMouseEnter={(e) => {
            if (!isPlaylistsActive) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isPlaylistsActive) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
            }
          }}
          title='View all playlists'
        >
          <FaListUl size={12} />
          <span>Playlists</span>
        </button>

        {/* Artists Button */}
        <button
          onClick={() => navigate('/artists?filter=all')}
          style={getButtonStyle(isArtistsActive, '#ffffff')}
          onMouseEnter={(e) => {
            if (!isArtistsActive) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isArtistsActive) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
            }
          }}
          title='View all artists'
        >
          <FaMicrophone size={12} />
          <span>Artists</span>
        </button>

        {/* Following Button */}
        <button
          onClick={() => navigate('/artists?filter=following')}
          style={getButtonStyle(isFollowingActive, '#22c55e')}
          onMouseEnter={(e) => {
            if (!isFollowingActive) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isFollowingActive) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
            }
          }}
          title='View followed artists'
        >
          <FaUserCheck size={12} />
          <span>Following</span>
        </button>
      </Space>
    </div>
  );
});

NavbarQuickLinks.displayName = 'NavbarQuickLinks';

export default NavbarQuickLinks;
