import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { FaGlobe, FaLock, FaCheck } from 'react-icons/fa6';
import { FiMusic, FiX } from 'react-icons/fi';

// Redux
import { useAppDispatch, useAppSelector } from '../../store/store';
import { createPlaylistModalActions } from '../../store/slices/createPlaylistModal';
import { fetchMyPlaylists } from '../../store/slices/yourLibrary';
import { uiActions } from '../../store/slices/ui';
import { api } from '../../store/api';

// Services
import { playlistService } from '../../services/playlists';

export const CreatePlaylistModal: FC = memo(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { isOpen, initialName, initialTrackUri, isPublic: defaultIsPublic } = useAppSelector(
    (state) => state.createPlaylistModal
  );
  const user = useAppSelector((state) => state.auth.user);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
      setDescription('');
      setIsPublic(defaultIsPublic !== undefined ? defaultIsPublic : true);
      setErrorMessage('');
    }
  }, [isOpen, initialName, defaultIsPublic]);

  const handleClose = useCallback(() => {
    dispatch(createPlaylistModalActions.closeCreatePlaylistModal());
    setErrorMessage('');
  }, [dispatch]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!user || user.id === 'guest') {
      handleClose();
      dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter a playlist name');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await playlistService.createPlaylist(user.id, {
        name: trimmedName,
        description: description.trim(),
        is_public: isPublic,
      });

      const newPlaylist = response.data;

      // If initial track was passed (e.g. from TrackActions or AlbumActions)
      if (initialTrackUri && newPlaylist?.id) {
        try {
          await playlistService.addPlaylistItems(
            newPlaylist.id,
            [initialTrackUri],
            newPlaylist.snapshot_id
          );
        } catch (err) {
          console.warn('Could not add initial track to new playlist:', err);
        }
      }

      message.success(
        isPublic
          ? 'Public playlist created successfully!'
          : 'Private playlist created successfully!'
      );

      dispatch(fetchMyPlaylists());
      dispatch(api.util.invalidateTags(['MyPlaylists']));
      handleClose();

      if (newPlaylist?.id) {
        navigate(`/playlist/${newPlaylist.id}`);
      }
    } catch (err: any) {
      const serverErr = err?.response?.data?.name || err?.response?.data?.error || err?.response?.data?.detail;
      if (serverErr) {
        setErrorMessage(Array.isArray(serverErr) ? serverErr[0] : String(serverErr));
      } else {
        setErrorMessage('Failed to create playlist. Please try a different name.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      centered
      width={520}
      closable={false}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          background: 'rgba(0, 0, 0, 0.75)',
        },
        content: {
          background: '#181818',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        },
      }}
    >
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1db954 0%, #107c35 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '18px',
              }}
            >
              <FiMusic />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.3px',
                }}
              >
                Create Playlist
              </h2>
              <span style={{ fontSize: '13px', color: '#a7a7a7' }}>
                Build your collection and choose visibility
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b3b3b3',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#b3b3b3';
            }}
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Visibility Selector: 2 Distinct Buttons */}
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            Playlist Privacy
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {/* Public Playlist Button */}
            <button
              type='button'
              onClick={() => {
                setIsPublic(true);
                setErrorMessage('');
              }}
              style={{
                position: 'relative',
                padding: '16px 14px',
                borderRadius: '12px',
                border: isPublic
                  ? '2px solid #1ed760'
                  : '2px solid rgba(255, 255, 255, 0.08)',
                background: isPublic ? 'rgba(30, 215, 96, 0.08)' : '#242424',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isPublic) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                if (!isPublic) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              {isPublic && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#1ed760',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                  }}
                >
                  <FaCheck />
                </div>
              )}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: isPublic ? '#1ed760' : '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                <FaGlobe size={16} />
                <span>Public Playlist</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: isPublic ? '#d1d5db' : '#a0a0a0',
                  lineHeight: '1.4',
                }}
              >
                Visible to everyone. Searchable by any user across the platform.
              </p>
            </button>

            {/* Private Playlist Button */}
            <button
              type='button'
              onClick={() => {
                setIsPublic(false);
                setErrorMessage('');
              }}
              style={{
                position: 'relative',
                padding: '16px 14px',
                borderRadius: '12px',
                border: !isPublic
                  ? '2px solid #1ed760'
                  : '2px solid rgba(255, 255, 255, 0.08)',
                background: !isPublic ? 'rgba(30, 215, 96, 0.08)' : '#242424',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (isPublic) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                if (isPublic) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              {!isPublic && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#1ed760',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                  }}
                >
                  <FaCheck />
                </div>
              )}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: !isPublic ? '#1ed760' : '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                <FaLock size={16} />
                <span>Private Playlist</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: !isPublic ? '#d1d5db' : '#a0a0a0',
                  lineHeight: '1.4',
                }}
              >
                Only accessible by you. Hidden from public searches and other users.
              </p>
            </button>
          </div>

          {/* Playlist Name Input */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor='playlist-name-input'
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              Playlist Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id='playlist-name-input'
              type='text'
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMessage('');
              }}
              placeholder='e.g. My Favorite Bangers'
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: errorMessage ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                background: '#242424',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                if (!errorMessage) e.target.style.borderColor = '#1ed760';
              }}
              onBlur={(e) => {
                if (!errorMessage) e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            />
          </div>

          {/* Description Input */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor='playlist-desc-input'
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              Description <span style={{ fontSize: '11px', color: '#a7a7a7', fontWeight: 400 }}>(Optional)</span>
            </label>
            <textarea
              id='playlist-desc-input'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Give your playlist a catchy description'
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: '#242424',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1ed760';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            />
          </div>

          {/* Error message */}
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '16px',
            }}
          >
            <button
              type='button'
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                borderRadius: '9999px',
                border: 'none',
                background: 'transparent',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Cancel
            </button>

            <button
              type='submit'
              disabled={loading || !name.trim()}
              style={{
                padding: '12px 28px',
                borderRadius: '9999px',
                border: 'none',
                background: '#1ed760',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !name.trim() ? 0.6 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!loading && name.trim()) {
                  e.currentTarget.style.transform = 'scale(1.04)';
                  e.currentTarget.style.background = '#1fdf64';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#1ed760';
              }}
            >
              {loading ? (
                <span>Creating...</span>
              ) : (
                <span>{isPublic ? 'Create Public Playlist' : 'Create Private Playlist'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
});

CreatePlaylistModal.displayName = 'CreatePlaylistModal';
