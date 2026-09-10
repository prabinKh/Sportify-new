import React, { FC, memo, useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { FaGlobe, FaLock, FaCheck } from 'react-icons/fa6';
import { FiRadio, FiX } from 'react-icons/fi';

// Redux & Services
import { useAppDispatch, useAppSelector } from '../../store/store';
import { uiActions } from '../../store/slices/ui';
import { roomService } from '../../services/rooms';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (roomCode: string) => void;
}

export const CreateRoomModal: FC<CreateRoomModalProps> = memo(({ open, onClose, onCreated }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open) {
      setName(user?.display_name ? `${user.display_name}'s Jam Party` : 'Chill Beats Jam Room');
      setDescription('');
      setIsPublic(true);
      setErrorMessage('');
    }
  }, [open, user]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!user || user.id === 'guest') {
      onClose();
      dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'));
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter a room name');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const newRoom = await roomService.createRoom({
        name: trimmedName,
        description: description.trim(),
        is_public: isPublic,
      });

      message.success(`Room "${newRoom.name}" created! Code: ${newRoom.code}`);
      onClose();
      if (onCreated) {
        onCreated(newRoom.code);
      } else {
        navigate(`/room/${newRoom.code}?invite=true`);
      }
    } catch (err: any) {
      const serverErr = err?.response?.data?.error || err?.response?.data?.detail;
      setErrorMessage(serverErr || 'Failed to create room. Please try again.');
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
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
              }}
            >
              <FiRadio />
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
                Create Jam Room
              </h2>
              <span style={{ fontSize: '13px', color: '#a7a7a7' }}>
                Listen in real-time sync with friends
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
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
          {/* Room Privacy Selector */}
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
            Room Access
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {/* Public Room Button */}
            <button
              type='button'
              onClick={() => setIsPublic(true)}
              style={{
                position: 'relative',
                padding: '16px 14px',
                borderRadius: '12px',
                border: isPublic
                  ? '2px solid #10b981'
                  : '2px solid rgba(255, 255, 255, 0.08)',
                background: isPublic ? 'rgba(16, 185, 129, 0.08)' : '#242424',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.2s ease',
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
                    background: '#10b981',
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
                  color: isPublic ? '#10b981' : '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                <FaGlobe size={16} />
                <span>Public Room</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: isPublic ? '#d1d5db' : '#a0a0a0',
                  lineHeight: '1.4',
                }}
              >
                Listed on the Jam Rooms page for anyone to discover and join.
              </p>
            </button>

            {/* Private Room Button */}
            <button
              type='button'
              onClick={() => setIsPublic(false)}
              style={{
                position: 'relative',
                padding: '16px 14px',
                borderRadius: '12px',
                border: !isPublic
                  ? '2px solid #10b981'
                  : '2px solid rgba(255, 255, 255, 0.08)',
                background: !isPublic ? 'rgba(16, 185, 129, 0.08)' : '#242424',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.2s ease',
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
                    background: '#10b981',
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
                  color: !isPublic ? '#10b981' : '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                <FaLock size={16} />
                <span>Private Code-Only</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: !isPublic ? '#d1d5db' : '#a0a0a0',
                  lineHeight: '1.4',
                }}
              >
                Only people with your 6-character room code can join.
              </p>
            </button>
          </div>

          {/* Room Name Input */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor='room-name-input'
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              Room Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id='room-name-input'
              type='text'
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMessage('');
              }}
              placeholder='e.g. Late Night Nepali Chill Beats'
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
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Description Input */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor='room-desc-input'
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
              id='room-desc-input'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Tell listeners what vibe to expect'
              rows={2}
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
                boxSizing: 'border-box',
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
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '16px',
            }}
          >
            <button
              type='button'
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '9999px',
                border: 'none',
                background: 'transparent',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
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
                background: '#10b981',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !name.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Creating...' : 'Start Jam Session'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
});

CreateRoomModal.displayName = 'CreateRoomModal';
