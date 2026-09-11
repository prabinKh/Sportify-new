import { FC, memo, useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { Modal, message } from 'antd';
import {
  FaCamera,
  FaPencil,
  FaImage,
  FaLink,
  FaCheck,
  FaTrashCan,
  FaUser,
  FaEnvelope,
  FaCircleExclamation,
} from 'react-icons/fa6';

// Redux
import { useAppDispatch, useAppSelector } from '../../store/store';
import { updateUserProfile } from '../../store/slices/auth';
import { profileActions } from '../../store/slices/profile';
import { ARTISTS_DEFAULT_IMAGE } from '../../constants/spotify';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  { name: 'Neon Headset', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
  { name: 'Cyber Wave', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Lo-Fi Vibe', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80' },
  { name: 'Studio Producer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
  { name: 'Pop Star', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80' },
  { name: 'Vinyl DJ', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80' },
];

export const EditProfileModal: FC<EditProfileModalProps> = memo(({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [activePhotoTab, setActivePhotoTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && currentUser) {
      setDisplayName(currentUser.display_name || currentUser.username || '');
      setEmail(currentUser.email || '');
      const currentPic = currentUser.images?.[0]?.url || currentUser.avatar_url || ARTISTS_DEFAULT_IMAGE;
      setAvatarUrl(currentPic);
      setAvatarPreview(currentPic);
      setAvatarFile(null);
      setError(null);
    }
  }, [open, currentUser]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        message.error('Image size must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
    }
  };

  const handleSelectPreset = (url: string) => {
    setAvatarFile(null);
    setAvatarUrl(url);
    setAvatarPreview(url);
  };

  const handleUrlChange = (url: string) => {
    setAvatarFile(null);
    setAvatarUrl(url);
    setAvatarPreview(url || ARTISTS_DEFAULT_IMAGE);
  };

  const handleResetAvatar = () => {
    setAvatarFile(null);
    setAvatarUrl(ARTISTS_DEFAULT_IMAGE);
    setAvatarPreview(ARTISTS_DEFAULT_IMAGE);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        display_name: displayName.trim(),
        email: email.trim(),
      };

      if (avatarFile) {
        payload.avatar = avatarFile;
      } else if (avatarUrl) {
        payload.avatar_url = avatarUrl;
      }

      const res: any = await dispatch(updateUserProfile(payload)).unwrap();
      if (res?.user) {
        dispatch(profileActions.setProfileUser(res.user));
      }

      message.success('Profile updated successfully!');
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={560}
      destroyOnClose
      styles={{
        content: {
          background: '#242424',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
        },
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            Profile details
          </h2>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <FaCircleExclamation />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Avatar Preview Box */}
            <div style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                }}
                onClick={() => fileInputRef.current?.click()}
                title='Click to upload new photo'
              >
                <img
                  src={avatarPreview || ARTISTS_DEFAULT_IMAGE}
                  alt='Profile Preview'
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = ARTISTS_DEFAULT_IMAGE;
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#fff',
                    opacity: 0.9,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <FaCamera size={26} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Choose photo</span>
                </div>
              </div>

              <input
                type='file'
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept='image/*'
                onChange={handleFileChange}
              />

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 20,
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <FaImage size={11} />
                  <span>Upload</span>
                </button>
                <button
                  type='button'
                  onClick={handleResetAvatar}
                  style={{
                    background: 'transparent',
                    color: '#999',
                    border: '1px solid #444',
                    borderRadius: 20,
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                  title='Reset to default'
                >
                  <FaTrashCan size={11} />
                </button>
              </div>
            </div>

            {/* Form Inputs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 6,
                  }}
                >
                  Name <span style={{ color: '#1db954' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <FaUser style={{ position: 'absolute', left: 12, color: '#888', fontSize: 13 }} />
                  <input
                    type='text'
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder='Add your name'
                    maxLength={50}
                    required
                    style={{
                      width: '100%',
                      height: 40,
                      background: '#333',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 6,
                      color: '#fff',
                      padding: '0 12px 0 34px',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 6,
                  }}
                >
                  Email
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <FaEnvelope style={{ position: 'absolute', left: 12, color: '#888', fontSize: 13 }} />
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='yourname@example.com'
                    style={{
                      width: '100%',
                      height: 40,
                      background: '#333',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 6,
                      color: '#fff',
                      padding: '0 12px 0 34px',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Photo Source Selector (URL / Presets) */}
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type='button'
                    onClick={() => setActivePhotoTab('presets')}
                    style={{
                      background: activePhotoTab === 'presets' ? '#1db954' : '#333',
                      color: activePhotoTab === 'presets' ? '#000' : '#ccc',
                      border: 'none',
                      borderRadius: 14,
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Preset Avatars
                  </button>
                  <button
                    type='button'
                    onClick={() => setActivePhotoTab('url')}
                    style={{
                      background: activePhotoTab === 'url' ? '#1db954' : '#333',
                      color: activePhotoTab === 'url' ? '#000' : '#ccc',
                      border: 'none',
                      borderRadius: 14,
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Image URL
                  </button>
                </div>

                {activePhotoTab === 'presets' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PRESET_AVATARS.map((p, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectPreset(p.url)}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: avatarPreview === p.url ? '2px solid #1db954' : '2px solid transparent',
                          boxShadow: avatarPreview === p.url ? '0 0 8px #1db954' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                        title={p.name}
                      >
                        <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}

                {activePhotoTab === 'url' && (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <FaLink style={{ position: 'absolute', left: 10, color: '#888', fontSize: 12 }} />
                    <input
                      type='url'
                      value={avatarFile ? '' : avatarUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder='Paste direct image link (https://...)'
                      style={{
                        width: '100%',
                        height: 34,
                        background: '#333',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                        color: '#fff',
                        padding: '0 10px 0 30px',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, lineHeight: 1.4 }}>
            By proceeding, you agree to give FuckSubscription access to the image you choose to upload. Please make sure you have the right to upload the image.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6 }}>
            <button
              type='button'
              onClick={onClose}
              style={{
                background: 'transparent',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '8px 20px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading}
              style={{
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: 24,
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 28px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
});

EditProfileModal.displayName = 'EditProfileModal';
