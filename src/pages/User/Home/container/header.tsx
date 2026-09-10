import { useState, FC, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCamera, FaPencil } from 'react-icons/fa6';
import { useAppSelector } from '../../../../store/store';
import { ARTISTS_DEFAULT_IMAGE } from '../../../../constants/spotify';
import { EditProfileModal } from '../../../../components/Modals/EditProfileModal';

export const UserHeader: FC<{ color: string }> = memo((props) => {
  const { t } = useTranslation(['profile']);
  const profileUser = useAppSelector((state) => state.profile.user);
  const currentUser = useAppSelector((state) => state.auth.user);

  const [editModalOpen, setEditModalOpen] = useState(false);

  // Active user data preferring profileUser or falling back to currentUser
  const user = profileUser || currentUser;

  // Check if viewing own profile (or guest/unauthenticated active user)
  const isOwner = Boolean(
    currentUser && (
      !profileUser ||
      String(currentUser.id) === String(profileUser.id) ||
      currentUser.username === profileUser.username ||
      currentUser.username === profileUser.id ||
      profileUser.id === 'guest' ||
      profileUser.id === 'youtube_user' ||
      currentUser.id === 'guest'
    )
  );

  const avatarSrc =
    user?.images && user.images.length
      ? user.images[0].url
      : (user as any)?.avatar_url || ARTISTS_DEFAULT_IMAGE;

  return (
    <>
      <div className='profile-header'>
        <div
          className='profile-header-cover'
          style={{
            backgroundColor: props.color,
          }}
        ></div>

        <div className='profile-header-background'></div>
        <div className='profile-header-content'>
          {/* Image section */}
          <div></div>
          <div className='profile-img-container'>
            <div
              className={`profile-img ${isOwner ? 'editable-avatar' : ''}`}
              onClick={() => isOwner && setEditModalOpen(true)}
              style={{ cursor: isOwner ? 'pointer' : 'default', position: 'relative' }}
              title={isOwner ? 'Click to edit profile picture' : undefined}
            >
              <div
                style={{
                  borderRadius: '50%',
                  height: '100%',
                  width: '100%',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              >
                <img
                  src={avatarSrc}
                  alt={user?.display_name || 'User Profile'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = ARTISTS_DEFAULT_IMAGE;
                  }}
                />

                {isOwner && (
                  <div
                    className='profile-img-hover-overlay'
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      color: '#ffffff',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      borderRadius: '50%',
                    }}
                  >
                    <FaCamera size={32} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Choose photo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Text Section */}
          <div className='profile-header-text'>
            <span className='type'>{t('Profile')}</span>

            <span
              className='profile-header-name-container'
              onClick={() => isOwner && setEditModalOpen(true)}
              style={{ cursor: isOwner ? 'pointer' : 'default' }}
              title={isOwner ? 'Click to edit name' : undefined}
            >
              <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <span>{user?.display_name || user?.username || 'User'}</span>
                {isOwner && (
                  <FaPencil
                    size={22}
                    className='name-edit-icon'
                    style={{ color: 'rgba(255, 255, 255, 0.5)', transition: 'color 0.2s ease' }}
                  />
                )}
              </h1>
            </span>

            <div className='profile-header-details-container' style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {user?.followers?.total != null ? (
                <span data-encore-id='text'>
                  {user.followers.total} {t('Followers')}
                </span>
              ) : null}

              {isOwner && (
                <button
                  type='button'
                  onClick={() => setEditModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    borderRadius: 20,
                    padding: '6px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className='hover:bg-white hover:text-black hover:scale-105'
                >
                  <FaPencil size={12} />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal open={editModalOpen} onClose={() => setEditModalOpen(false)} />
    </>
  );
});

UserHeader.displayName = 'UserHeader';
