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

  const handleLogout = useCallback(() => {
    dispatch(authActions.logout());
    message.success(t('Logged out successfully'));
    navigate('/');
  }, [dispatch, navigate, t]);

  const handleLogin = useCallback(() => {
    dispatch(uiActions.openLoginModal(''));
  }, [dispatch]);

  const getMenuItems = (): MenuProps['items'] => {
    if (user) {
      return [
        {
          key: 'user-info',
          disabled: true,
          label: (
            <div style={{ padding: '4px 2px', cursor: 'default' }}>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.95rem' }}>
                {user.display_name || 'User'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a7a7a7' }}>
                {user.email || user.id}
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
        key: 'login',
        icon: <FaArrowRightToBracket style={{ fontSize: 14 }} />,
        label: t('Log in'),
        onClick: handleLogin,
      },
      {
        key: 'signup',
        icon: <FaUserPlus style={{ fontSize: 14 }} />,
        label: t('Sign in / Sign up'),
        onClick: handleLogin,
      },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div
      className='flex r-0 w-full flex-row items-center justify-between bg-gray-900 rounded-t-md z-10'
      style={{ backgroundColor: `rgba(12, 12, 12, ${opacity}%)` }}
    >
      <div className='flex flex-row items-center'>
        <Space size={12} align='center'>
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement='bottomRight'
            arrow
          >
            <div style={{ cursor: 'pointer' }}>
              <Tooltip title={user ? user.display_name || t('Profile') : t('Account')}>
                <button
                  type='button'
                  aria-label='Account menu'
                  className='flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95'
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#181818',
                    border: '2px solid rgba(255, 255, 255, 0.15)',
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {user && user.images && user.images.length ? (
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
                  ) : user ? (
                    <FaUser size={18} color='#ffffff' />
                  ) : (
                    <FaCircleUser size={22} color='#b3b3b3' />
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
