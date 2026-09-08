import { FC, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUserPlus, FaUserCheck } from 'react-icons/fa6';

// Redux
import { artistActions } from '../../../../store/slices/artist';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { yourLibraryActions } from '../../../../store/slices/yourLibrary';
import { profileActions } from '../../../../store/slices/profile';

// Services
import { userService } from '../../../../services/users';
import { uiActions } from '../../../../store/slices/ui';

const FollowArtist: FC<{ id: string; onToggle: () => void }> = ({ id, onToggle }) => {
  const { t } = useTranslation(['artist']);
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    (state) => !!state.auth.user,
    (prev, next) => prev === next
  );
  const [loading, setLoading] = useState(false);

  const handleFollow = useCallback(async () => {
    if (!user) {
      return dispatch(uiActions.openLoginTooltip());
    }
    setLoading(true);
    try {
      await userService.followArtists([id]);
      dispatch(artistActions.setFollowing({ following: true }));
      onToggle();
    } catch (err) {
      console.error('Follow artist error:', err);
    } finally {
      setLoading(false);
    }
  }, [dispatch, id, onToggle, user]);

  return (
    <button
      className='follow-artist-btn'
      onClick={handleFollow}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 20px',
        borderRadius: '9999px',
        border: '1px solid rgba(255, 255, 255, 0.45)',
        background: 'transparent',
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#ffffff';
        e.currentTarget.style.transform = 'scale(1.04)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.45)';
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <FaUserPlus size={15} />
      <span>{t('Follow')}</span>
    </button>
  );
};

const UnfollowArtist: FC<{ id: string; onToggle: () => void }> = ({ id, onToggle }) => {
  const { t } = useTranslation(['artist']);
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    (state) => !!state.auth.user,
    (prev, next) => prev === next
  );
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleUnfollow = useCallback(async () => {
    if (!user) {
      return dispatch(uiActions.openLoginTooltip());
    }
    setLoading(true);
    try {
      await userService.unfollowArtists([id]);
      dispatch(artistActions.setFollowing({ following: false }));
      onToggle();
    } catch (err) {
      console.error('Unfollow artist error:', err);
    } finally {
      setLoading(false);
    }
  }, [dispatch, id, onToggle, user]);

  return (
    <button
      className='follow-artist-btn following'
      onClick={handleUnfollow}
      disabled={loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 20px',
        borderRadius: '9999px',
        border: isHovered ? '1px solid #ef4444' : '1px solid #22c55e',
        background: isHovered ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
        color: isHovered ? '#ef4444' : '#22c55e',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      <FaUserCheck size={15} />
      <span>{isHovered ? t('Unfollow') : t('Following')}</span>
    </button>
  );
};

export const FollowArtistButton = ({ id }: { id: string }) => {
  const dispatch = useAppDispatch();
  const isSaved = useAppSelector((state) => state.artist.following);

  const onToggle = () => {
    dispatch(yourLibraryActions.fetchMyArtists());
    dispatch(profileActions.fetchMyArtists());
  };

  return isSaved ? (
    <UnfollowArtist id={id} onToggle={onToggle} />
  ) : (
    <FollowArtist id={id} onToggle={onToggle} />
  );
};

