import { useCallback } from 'react';
import { Dropdown, MenuProps, message, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaUser,
  FaCircleUser,
  FaArrowRightFromBracket,
  FaArrowRightToBracket,
  FaUserPlus,
  FaHeart,
  FaMicrophone,
  FaListUl,
  FaHeadphones,
  FaWindowRestore,
  FaRadio,
  FaUsers,
  FaCommentDots,
} from 'react-icons/fa6';

// Redux
import { uiActions } from '../../../../store/slices/ui';
import { authActions, loginToSpotify } from '../../../../store/slices/auth';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { Tooltip } from '../../../Tooltip';

const Header = ({ opacity }: { opacity: number; title?: string }) => {
  const { t } = useTranslation(['navbar', 'home']);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector(
    (state) => state.auth.user,
    (prev, next) => prev?.id === next?.id
  );

  const isAuthenticated = Boolean(user && user.id && user.id !== 'guest');

  const handleLogout = useCallback(() => {
    dispatch(authActions.logout());
    message.success(t('Logged out successfully'));
    navigate('/');
  }, [dispatch, navigate, t]);

  const handleOpenModal = useCallback(() => {
    dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
  }, [dispatch]);

  const getMenuItems = (): MenuProps['items'] => {
    if (isAuthenticated && user) {
      return [
        {
          key: 'user-info',
          disabled: true,
          label: (
            <div style={{ padding: '6px 4px', cursor: 'default' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                {user.display_name || user.username || 'User'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#1db954', fontWeight: 600 }}>
                {user.email || `@${user.username || user.id}`}
              </div>
            </div>
          ),
        },
        { type: 'divider' },
        {
          key: 'profile',
          icon: <FaUser style={{ fontSize: 14 }} />,
          label: t('Profile'),
          onClick: () => navigate(`/users/${user.id}`),
        },
        {
          key: 'jam-rooms',
          icon: <FaRadio style={{ fontSize: 14, color: '#10b981' }} />,
          label: (
            <span style={{ fontWeight: 700, color: '#10b981' }}>Live Jam Rooms 🎧</span>
          ),
          onClick: () => navigate('/rooms'),
        },
        {
          key: 'friends',
          icon: <FaUsers style={{ fontSize: 14, color: '#f59e0b' }} />,
          label: (
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>Friends 👋</span>
          ),
          onClick: () => navigate('/friends'),
        },
        {
          key: 'messages',
          icon: <FaCommentDots style={{ fontSize: 14, color: '#3b82f6' }} />,
          label: (
            <span style={{ fontWeight: 700, color: '#3b82f6' }}>Messages 💬</span>
          ),
          onClick: () => navigate('/messages'),
        },
        {
          key: 'playlists',
          icon: <FaListUl style={{ fontSize: 14, color: '#10b981' }} />,
          label: 'Playlists',
          onClick: () => navigate('/playlist'),
        },
        {
          key: 'artists',
          icon: <FaMicrophone style={{ fontSize: 14, color: '#3b82f6' }} />,
          label: t('Artists'),
          onClick: () => navigate('/artists'),
        },
        {
          key: 'liked',
          icon: <FaHeart style={{ fontSize: 14, color: '#e91429' }} />,
          label: t('Liked Songs'),
          onClick: () => navigate('/collection/tracks'),
        },
        { type: 'divider' },
        {
          key: 'switch-account',
          icon: <FaArrowRightToBracket style={{ fontSize: 14, color: '#a7a7a7' }} />,
          label: 'Switch / Add Account',
          onClick: () => navigate('/login'),
        },
        {
          key: 'logout',
          icon: <FaArrowRightFromBracket style={{ fontSize: 14 }} />,
          label: t('Log out'),
          danger: true,
          onClick: handleLogout,
        },
      ];
    }

    return [
      {
        key: 'guest-badge',
        disabled: true,
        label: (
          <div style={{ padding: '6px 4px', cursor: 'default' }}>
            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem' }}>
              Account & Options
            </div>
            <div style={{ fontSize: '0.75rem', color: '#888' }}>
              Sign in to save playlists & favorites
            </div>
          </div>
        ),
      },
      { type: 'divider' },
      {
        key: 'login',
        icon: <FaArrowRightToBracket style={{ fontSize: 14, color: '#1db954' }} />,
        label: (
          <span style={{ fontWeight: 700, color: '#ffffff' }}>Log In</span>
        ),
        onClick: () => navigate('/login'),
      },
      {
        key: 'signup',
        icon: <FaUserPlus style={{ fontSize: 14, color: '#1db954' }} />,
        label: (
          <span style={{ fontWeight: 700, color: '#ffffff' }}>Sign Up for Free</span>
        ),
        onClick: () => navigate('/signup'),
      },
      {
        key: 'quick-modal',
        icon: <FaWindowRestore style={{ fontSize: 13, color: '#a7a7a7' }} />,
        label: 'Quick Popup Sign In',
        onClick: handleOpenModal,
      },
      { type: 'divider' },
      {
        key: 'sign-in-modal',
        icon: <FaHeadphones style={{ fontSize: 14, color: '#1db954' }} />,
        label: 'Sign In / Register',
        onClick: handleOpenModal,
      },
      {
        key: 'jam-rooms',
        icon: <FaRadio style={{ fontSize: 14, color: '#10b981' }} />,
        label: (
          <span style={{ fontWeight: 700, color: '#10b981' }}>Live Jam Rooms 🎧</span>
        ),
        onClick: () => navigate('/rooms'),
      },
      {
        key: 'playlists',
        icon: <FaListUl style={{ fontSize: 14, color: '#10b981' }} />,
        label: 'Browse Playlists',
        onClick: () => navigate('/playlist'),
      },
      {
        key: 'artists',
        icon: <FaMicrophone style={{ fontSize: 14, color: '#3b82f6' }} />,
        label: 'Browse Artists',
        onClick: () => navigate('/artists'),
      },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div
      className='flex r-0 w-full flex-row items-center justify-end bg-gray-900 rounded-t-md z-10'
      style={{ backgroundColor: `rgba(12, 12, 12, ${opacity}%)` }}
    >
      <div className='flex flex-row items-center gap-3'>
        <Space size={12} align='center'>

          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement='bottomRight'
            arrow
          >
            <div style={{ cursor: 'pointer' }}>
              <Tooltip title={isAuthenticated && user ? user.display_name || t('Profile') : 'Account & Options'}>
                <button
                  type='button'
                  aria-label='Account menu'
                  className='flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95'
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: isAuthenticated ? '#242424' : '#181818',
                    border: isAuthenticated
                      ? '2px solid rgba(29, 185, 84, 0.6)'
                      : '2px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isAuthenticated && user && user.images && user.images.length > 0 ? (
                    <img
                      className='avatar'
                      id='user-avatar'
                      alt={user.display_name || 'User Avatar'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      src={user.images[0].url}
                    />
                  ) : isAuthenticated ? (
                    <FaUser size={18} color='#ffffff' />
                  ) : (
                    <FaCircleUser size={22} color='#ffffff' />
                  )}
                </button>
              </Tooltip>
            </div>
          </Dropdown>
        </Space>
      </div>
    </div>
  );
};

export default Header;
