import { FC, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaXmark,
  FaUser,
  FaCircleUser,
  FaHeart,
  FaMicrophone,
  FaListUl,
  FaUserCheck,
  FaRadio,
  FaUsers,
  FaCommentDots,
  FaArrowRightFromBracket,
  FaArrowRightToBracket,
  FaUserPlus,
  FaChevronRight,
} from 'react-icons/fa6';

// Redux
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { authActions } from '../../../../store/slices/auth';
import { uiActions } from '../../../../store/slices/ui';
import { message } from 'antd';

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const MobileNavDrawer: FC<MobileNavDrawerProps> = memo(({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { t } = useTranslation(['navbar', 'home']);

  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = Boolean(user && user.id && user.id !== 'guest');

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    dispatch(authActions.logout());
    message.success(t('Logged out successfully'));
    navigate('/');
  };

  const handleOpenLoginModal = () => {
    onClose();
    dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
  };

  const isPathActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    if (path.includes('?')) {
      const [pathname, search] = path.split('?');
      return location.pathname === pathname && location.search.includes(search);
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isPlaylistsActive = location.pathname === '/playlist' || location.pathname === '/playlists';
  const isFollowingActive = location.pathname.includes('/artists') && location.search.includes('filter=following');
  const isArtistsActive = location.pathname.includes('/artists') && !isFollowingActive;
  const isLikedActive = location.pathname === '/collection/tracks';
  const isRoomsActive = location.pathname.startsWith('/rooms');
  const isFriendsActive = location.pathname === '/friends';
  const isMessagesActive = location.pathname.startsWith('/messages');

  return createPortal(
    <div
      className={`mobile-nav-portal ${open ? 'mobile-nav-portal--open' : ''}`}
      aria-hidden={!open}
    >
      {/* Backdrop overlay */}
      <div
        className='mobile-nav-backdrop'
        onClick={onClose}
        aria-label='Close menu'
      />

      {/* Slide-over Drawer Panel */}
      <aside className='mobile-nav-drawer' role='dialog' aria-modal='true' aria-label='Navigation Menu'>
        {/* Top Header / Close Button */}
        <div className='mobile-nav-header'>
          <div className='mobile-nav-brand'>
            <div className='mobile-nav-brand__logo'>
              <img src='/logo.png' alt='Sportify' />
            </div>
            <span className='mobile-nav-brand__title'>Sportify</span>
          </div>
          <button
            type='button'
            className='mobile-nav-close-btn'
            onClick={onClose}
            aria-label='Close navigation menu'
          >
            <FaXmark size={18} />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className='mobile-nav-content'>
          {/* User Profile Card / Auth Status */}
          {isAuthenticated && user ? (
            <div
              className='mobile-nav-profile-card'
              onClick={() => handleNavigate(`/users/${user.id}`)}
              role='button'
              tabIndex={0}
            >
              <div className='mobile-nav-profile-avatar'>
                {user.images && user.images.length > 0 ? (
                  <img
                    src={user.images[0].url}
                    alt={user.display_name || user.username || 'User'}
                  />
                ) : (
                  <FaUser size={20} color='#ffffff' />
                )}
                <span className='mobile-nav-profile-status-dot' />
              </div>
              <div className='mobile-nav-profile-info'>
                <span className='mobile-nav-profile-name'>
                  {user.display_name || user.username || 'User'}
                </span>
                <span className='mobile-nav-profile-handle'>
                  {user.email || `@${user.username || user.id}`}
                </span>
              </div>
              <div className='mobile-nav-profile-arrow'>
                <FaChevronRight size={12} />
              </div>
            </div>
          ) : (
            <div className='mobile-nav-guest-card'>
              <div className='mobile-nav-guest-info'>
                <div className='mobile-nav-guest-avatar'>
                  <FaCircleUser size={32} color='#1db954' />
                </div>
                <div>
                  <h4 className='mobile-nav-guest-title'>Enjoy Full Sportify</h4>
                  <p className='mobile-nav-guest-subtitle'>Sign in to save playlists, like songs & sync devices</p>
                </div>
              </div>
              <div className='mobile-nav-guest-actions'>
                <button
                  type='button'
                  className='mobile-nav-btn mobile-nav-btn--primary'
                  onClick={() => handleNavigate('/login')}
                >
                  <FaArrowRightToBracket size={14} />
                  <span>Log In</span>
                </button>
                <button
                  type='button'
                  className='mobile-nav-btn mobile-nav-btn--secondary'
                  onClick={() => handleNavigate('/signup')}
                >
                  <FaUserPlus size={14} />
                  <span>Sign Up</span>
                </button>
              </div>
            </div>
          )}

          {/* Section: Music & Library */}
          <div className='mobile-nav-section'>
            <div className='mobile-nav-section__title'>Library & Explore</div>
            <div className='mobile-nav-links'>
              <button
                type='button'
                className={`mobile-nav-link ${isPlaylistsActive ? 'active' : ''}`}
                onClick={() => handleNavigate('/playlist')}
              >
                <span className='mobile-nav-link__icon' style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <FaListUl size={15} />
                </span>
                <span className='mobile-nav-link__label'>Playlists</span>
                {isPlaylistsActive && <span className='mobile-nav-link__indicator' />}
              </button>

              <button
                type='button'
                className={`mobile-nav-link ${isArtistsActive ? 'active' : ''}`}
                onClick={() => handleNavigate('/artists?filter=all')}
              >
                <span className='mobile-nav-link__icon' style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  <FaMicrophone size={15} />
                </span>
                <span className='mobile-nav-link__label'>Artists</span>
                {isArtistsActive && <span className='mobile-nav-link__indicator' />}
              </button>

              <button
                type='button'
                className={`mobile-nav-link ${isFollowingActive ? 'active' : ''}`}
                onClick={() => handleNavigate('/artists?filter=following')}
              >
                <span className='mobile-nav-link__icon' style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                  <FaUserCheck size={15} />
                </span>
                <span className='mobile-nav-link__label'>Followed Artists</span>
                {isFollowingActive && <span className='mobile-nav-link__indicator' />}
              </button>

              <button
                type='button'
                className={`mobile-nav-link ${isLikedActive ? 'active' : ''}`}
                onClick={() => handleNavigate('/collection/tracks')}
              >
                <span className='mobile-nav-link__icon' style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  <FaHeart size={15} />
                </span>
                <span className='mobile-nav-link__label'>Liked Songs</span>
                {isLikedActive && <span className='mobile-nav-link__indicator' />}
              </button>
            </div>
          </div>

          {/* Section: Social & Live */}
          <div className='mobile-nav-section'>
            <div className='mobile-nav-section__title'>Social & Live</div>
            <div className='mobile-nav-links'>
              <button
                type='button'
                className={`mobile-nav-link ${isRoomsActive ? 'active' : ''}`}
                onClick={() => handleNavigate('/rooms')}
              >
                <span className='mobile-nav-link__icon' style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <FaRadio size={15} />
                </span>
                <span className='mobile-nav-link__label'>Live Jam Rooms</span>
                <span className='mobile-nav-badge mobile-nav-badge--live'>
                  <span className='live-dot' /> LIVE
                </span>
              </button>

              <button
                type='button'
                className={`mobile-nav-link ${isFriendsActive ? 'active' : ''}`}
                onClick={() => handleNavigate('/friends')}
              >
                <span className='mobile-nav-link__icon' style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <FaUsers size={15} />
                </span>
                <span className='mobile-nav-link__label'>Friends & Activity</span>
                {isFriendsActive && <span className='mobile-nav-link__indicator' />}
              </button>

              <button
                type='button'
                className={`mobile-nav-link ${isMessagesActive ? 'active' : ''}`}
                onClick={() => handleNavigate('/messages')}
              >
                <span className='mobile-nav-link__icon' style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  <FaCommentDots size={15} />
                </span>
                <span className='mobile-nav-link__label'>Messages</span>
                {isMessagesActive && <span className='mobile-nav-link__indicator' />}
              </button>
            </div>
          </div>

          {/* Section: Account & Actions */}
          <div className='mobile-nav-section mobile-nav-section--footer'>
            <div className='mobile-nav-links'>
              {isAuthenticated ? (
                <>
                  <button
                    type='button'
                    className='mobile-nav-link'
                    onClick={() => handleNavigate('/login')}
                  >
                    <span className='mobile-nav-link__icon' style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                      <FaArrowRightToBracket size={14} />
                    </span>
                    <span className='mobile-nav-link__label'>Switch / Add Account</span>
                  </button>

                  <button
                    type='button'
                    className='mobile-nav-link mobile-nav-link--danger'
                    onClick={handleLogout}
                  >
                    <span className='mobile-nav-link__icon' style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                      <FaArrowRightFromBracket size={14} />
                    </span>
                    <span className='mobile-nav-link__label'>Log Out</span>
                  </button>
                </>
              ) : (
                <button
                  type='button'
                  className='mobile-nav-link'
                  onClick={handleOpenLoginModal}
                >
                  <span className='mobile-nav-link__icon' style={{ background: 'rgba(29, 185, 84, 0.15)', color: '#1db954' }}>
                    <FaCircleUser size={15} />
                  </span>
                  <span className='mobile-nav-link__label'>Quick Pop-up Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
});

MobileNavDrawer.displayName = 'MobileNavDrawer';
export default MobileNavDrawer;
