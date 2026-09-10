// Components
import { Dropdown, message } from 'antd';
import { AddIcon, NewPlaylistIcon } from '../../../Icons';

// Utils
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

// I18n
import { useTranslation } from 'react-i18next';

// Services
import { playlistService } from '../../../../services/playlists';

// Redux
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { uiActions } from '../../../../store/slices/ui';
import { createPlaylistModalActions } from '../../../../store/slices/createPlaylistModal';

export const AddPlaylistButton = memo(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(
    (state) => state.auth.user,
    (prev, next) => prev?.id === next?.id
  );

  const { t } = useTranslation(['navbar']);

  const onClick = () => {
    if (!user || user.id === 'guest') {
      return dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
    }
    dispatch(createPlaylistModalActions.openCreatePlaylistModal());
  };

  return (
    <Dropdown
      placement='bottomRight'
      trigger={['click']}
      rootClassName='create-playlist-dropdown'
      menu={{
        items: [
          {
            key: 'create',
            onClick,
            label: (
              <div className='create-playlist-menu-item'>
                <div className='create-playlist-menu-item__icon'>
                  <NewPlaylistIcon
                    className='create-playlist-menu-item__svg'
                    style={{
                      height: 20,
                      maxWidth: 20,
                      cursor: 'default',
                    }}
                  />
                </div>
                <div className='create-playlist-menu-item__text'>
                  <span className='create-playlist-menu-item__title'>{t('Playlist')}</span>
                  <span className='create-playlist-menu-item__description'>
                    {t('Create a playlist with songs or episodes')}
                  </span>
                </div>
              </div>
            ),
          },
        ],
      }}
    >
      <button className='addButton add-playlist-button' aria-label={t('Create a new Playlist')}>
        <AddIcon />
      </button>
    </Dropdown>
  );
});
