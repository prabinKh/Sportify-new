// Components
import { AddPlaylistButton } from './AddPlaylistButton';
import { CloseIcon, LibraryCollapsedIcon, LibraryIcon } from '../../../Icons';
import { FaUserCheck } from 'react-icons/fa6';

// Utils
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import { Flex, Space } from 'antd';
import { Tooltip } from '../../../Tooltip';

// I18n
import { useTranslation } from 'react-i18next';

// Redux
import { getLibraryCollapsed, uiActions } from '../../../../store/slices/ui';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { yourLibraryActions } from '../../../../store/slices/yourLibrary';

const isMobile = window.innerWidth < 900;

const CloseButton = () => {
  const dispatch = useAppDispatch();

  return (
    <div className='playing-section-close-button'>
      <button
        onClick={() => {
          dispatch(uiActions.collapseLibrary());
        }}
      >
        <CloseIcon />
      </button>
    </div>
  );
};

export const LibraryTitle = memo(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation(['navbar']);
  const collapsed = useAppSelector(getLibraryCollapsed);
  const userId = useAppSelector((state) => state.auth.user?.id) || 'youtube_user';

  const handleOpenFollowedArtists = () => {
    dispatch(yourLibraryActions.setFilter({ filter: 'ARTISTS' }));
    navigate('/artists?filter=following');
  };

  if (collapsed) {
    return (
      <Flex vertical align='center' gap={12}>
        <Tooltip placement='right' title={t('Expand your library')}>
          <button
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
            onClick={() => dispatch(uiActions.toggleLibrary())}
          >
            <LibraryCollapsedIcon />
          </button>
        </Tooltip>
        <Tooltip placement='right' title='Followed Artists'>
          <button
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: '#b3b3b3',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = '#282828';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#b3b3b3';
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={handleOpenFollowedArtists}
          >
            <FaUserCheck size={16} />
          </button>
        </Tooltip>
        <AddPlaylistButton />
      </Flex>
    );
  }

  return (
    <Flex align='center' justify='space-between'>
      <Space wrap align='center'>
        <Tooltip placement='top' title={t('Collapse your library')}>
          <button onClick={() => dispatch(uiActions.toggleLibrary())}>
            <LibraryIcon />
          </button>
        </Tooltip>
        <span className='Navigation-button'>{t('Your Library')}</span>
      </Space>

      <Space align='center' size={8}>
        <Tooltip placement='top' title='Followed Artists'>
          <button
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: '#b3b3b3',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = '#282828';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#b3b3b3';
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={handleOpenFollowedArtists}
          >
            <FaUserCheck size={16} />
          </button>
        </Tooltip>
        {isMobile ? <CloseButton /> : <AddPlaylistButton />}
      </Space>
    </Flex>
  );
});

