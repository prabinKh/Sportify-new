import { FC, memo, useCallback, useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import {
  FaHeadphones,
  FaMusic,
  FaUser,
  FaLock,
  FaEnvelope,
  FaIdCard,
  FaEye,
  FaEyeSlash,
  FaCircleCheck,
  FaCircleExclamation,
  FaArrowRightToBracket,
  FaUserPlus,
  FaCompass,
} from 'react-icons/fa6';
import tinycolor from 'tinycolor2';
import { useNavigate } from 'react-router-dom';

// Redux
import { uiActions } from '../../store/slices/ui';
import { loginUser, registerUser, loginToSpotify } from '../../store/slices/auth';
import { useAppDispatch, useAppSelector } from '../../store/store';

// Constants & Utils
import { DEFAULT_PAGE_COLOR } from '../../constants/spotify';
import { getImageAnalysis2 } from '../../utils/imageAnyliser';
import useIsMobile from '../../utils/isMobile';

export const LoginModal: FC = memo(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState<boolean>(false);
  const [color, setColor] = useState<string>(DEFAULT_PAGE_COLOR);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Sign In state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register state
  const [regUsername, setRegUsername] = useState<string>('');
  const [regDisplayName, setRegDisplayName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [regLoading, setRegLoading] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);

  const imgUrl = useAppSelector((state) => state.ui.loginModalItem);

  const onClose = useCallback(() => {
    dispatch(uiActions.closeLoginModal());
    setLoginError(null);
    setRegError(null);
  }, [dispatch]);

  useEffect(() => {
    if (imgUrl) {
      getImageAnalysis2(imgUrl)
        .then((c) => {
          let colorObj = tinycolor(c);
          while (colorObj.isLight()) {
            colorObj = colorObj.darken(10);
          }
          setColor(colorObj.toHexString());
          setOpen(true);
        })
        .catch(() => {
          setColor('#181818');
          setOpen(true);
        });
    } else {
      setOpen(false);
    }
  }, [imgUrl]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', class: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', class: 'weak' };
    if (score <= 3) return { score: 2, label: 'Medium', class: 'medium' };
    return { score: 3, label: 'Strong', class: 'strong' };
  };

  const pwdStrength = getPasswordStrength(regPassword);
  const passwordsMatch = regPassword.length > 0 && regConfirmPassword.length > 0 && regPassword === regConfirmPassword;

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Please fill in both username/email and password.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const result = await dispatch(loginUser({ username: loginUsername.trim(), password: loginPassword })).unwrap();
      message.success(`Welcome back, ${result.user?.display_name || result.user?.username || 'User'}!`);
      onClose();
    } catch (err: any) {
      if (typeof err === 'string') {
        setLoginError(err);
      } else if (err?.error) {
        setLoginError(err.error);
      } else {
        setLoginError('Invalid username/email or password.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regUsername.trim()) {
      setRegError('Username is required.');
      return;
    }
    if (regUsername.trim().length < 3) {
      setRegError('Username must be at least 3 characters.');
      return;
    }
    if (!regPassword) {
      setRegError('Password is required.');
      return;
    }
    if (regPassword.length < 4) {
      setRegError('Password must be at least 4 characters.');
      return;
    }
    if (regConfirmPassword && regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    setRegLoading(true);
    setRegError(null);

    try {
      const result = await dispatch(
        registerUser({
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
          display_name: regDisplayName.trim() || regUsername.trim(),
        })
      ).unwrap();

      message.success(`Account created! Welcome, ${result.user?.display_name || 'User'}!`);
      onClose();
    } catch (err: any) {
      if (typeof err === 'string') {
        setRegError(err);
      } else if (err?.username) {
        setRegError(Array.isArray(err.username) ? err.username[0] : 'Username already taken.');
      } else if (err?.email) {
        setRegError(Array.isArray(err.email) ? err.email[0] : 'Email is invalid or already in use.');
      } else {
        setRegError('Registration failed. Please check your inputs.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  if (!imgUrl) return null;

  return (
    <Modal
      centered
      width={isMobile ? '92%' : 760}
      open={open}
      footer={null}
      destroyOnClose
      onCancel={onClose}
      className='modern-auth-modal'
      wrapClassName='overlay-modal'
      styles={{
        body: { padding: 0 },
        content: {
          background: `linear-gradient(135deg, ${color} 0%, #121212 55%, #181818 100%)`,
          padding: isMobile ? '20px 16px' : '28px 32px',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.85)',
        },
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 18 : 28,
          alignItems: 'center',
        }}
      >
        {/* Left Side: Artwork & Cover */}
        <div
          style={{
            flex: isMobile ? '0 0 auto' : '0 0 220px',
            width: isMobile ? '100%' : 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: isMobile ? 140 : 200,
              height: isMobile ? 140 : 200,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <img
              alt='Cover'
              loading='lazy'
              src={imgUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.72rem',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              <img src='/logo.png' alt='FuckSubscription' style={{ width: 18, height: 18, objectFit: 'contain' }} />
              <span>FuckSubscription</span>
            </div>
          </div>
        </div>

        {/* Right Side: Sign In / Sign Up Forms */}
        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              {activeTab === 'login' ? 'Log in to continue' : 'Create your free account'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#a7a7a7', margin: '4px 0 0 0' }}>
              Save favorite music, create playlists, and enjoy custom DSP audio.
            </p>
          </div>

          {/* Tab Switcher Pill */}
          <div className='auth-tabs-nav' style={{ marginBottom: 16 }}>
            <button
              type='button'
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
                setRegError(null);
              }}
            >
              Sign In
            </button>
            <button
              type='button'
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setLoginError(null);
                setRegError(null);
              }}
            >
              Create Account
            </button>
          </div>

          {/* SIGN IN TAB */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className='auth-form' style={{ gap: 12 }}>
              {loginError && (
                <div className='auth-alert error'>
                  <FaCircleExclamation style={{ fontSize: 14, flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}

              <div className='form-group'>
                <label>Username or Email</label>
                <div className='auth-input-wrapper'>
                  <FaUser className='input-icon' />
                  <input
                    type='text'
                    placeholder='Username or email'
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    autoComplete='username'
                    required
                  />
                </div>
              </div>

              <div className='form-group'>
                <label>Password</label>
                <div className='auth-input-wrapper'>
                  <FaLock className='input-icon' />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder='Enter password'
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete='current-password'
                    required
                  />
                  <button
                    type='button'
                    className='toggle-pwd-btn'
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                  >
                    {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button
                type='submit'
                className='auth-submit-btn'
                disabled={loginLoading}
                style={{ marginTop: 6 }}
              >
                {loginLoading ? 'Signing In...' : (
                  <>
                    <FaArrowRightToBracket />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type='button'
                  className='social-btn'
                  style={{ flex: 1, height: 36, fontSize: '0.8rem' }}
                  onClick={() => {
                    onClose();
                    navigate('/signup');
                  }}
                >
                  <FaUserPlus style={{ color: '#1db954' }} />
                  <span>Create Account</span>
                </button>
                <button
                  type='button'
                  className='social-btn'
                  style={{ flex: 1, height: 36, fontSize: '0.8rem' }}
                  onClick={() => {
                    onClose();
                    navigate('/login');
                  }}
                >
                  <span>Full Page</span>
                </button>
              </div>
            </form>
          )}

          {/* REGISTER TAB */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className='auth-form' style={{ gap: 10 }}>
              {regError && (
                <div className='auth-alert error'>
                  <FaCircleExclamation style={{ fontSize: 14, flexShrink: 0 }} />
                  <span>{regError}</span>
                </div>
              )}

              <div className='form-row-2'>
                <div className='form-group'>
                  <label>Username *</label>
                  <div className='auth-input-wrapper'>
                    <FaUser className='input-icon' />
                    <input
                      type='text'
                      placeholder='Username'
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className='form-group'>
                  <label>Display Name</label>
                  <div className='auth-input-wrapper'>
                    <FaIdCard className='input-icon' />
                    <input
                      type='text'
                      placeholder='Display Name'
                      value={regDisplayName}
                      onChange={(e) => setRegDisplayName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className='form-group'>
                <label>Email Address (Optional)</label>
                <div className='auth-input-wrapper'>
                  <FaEnvelope className='input-icon' />
                  <input
                    type='email'
                    placeholder='yourname@example.com'
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className='form-row-2'>
                <div className='form-group'>
                  <label>Password *</label>
                  <div className='auth-input-wrapper'>
                    <FaLock className='input-icon' />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder='Min 4 chars'
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                    <button
                      type='button'
                      className='toggle-pwd-btn'
                      onClick={() => setShowRegPassword(!showRegPassword)}
                    >
                      {showRegPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  {regPassword.length > 0 && (
                    <div className='pwd-strength-container'>
                      <div className='strength-bars'>
                        <div className={`bar ${pwdStrength.score >= 1 ? `active-${pwdStrength.class}` : ''}`}></div>
                        <div className={`bar ${pwdStrength.score >= 2 ? `active-${pwdStrength.class}` : ''}`}></div>
                        <div className={`bar ${pwdStrength.score >= 3 ? `active-${pwdStrength.class}` : ''}`}></div>
                      </div>
                      <div className='strength-label'>
                        <span>Strength:</span>
                        <span className={`strength-status ${pwdStrength.class}`}>{pwdStrength.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className='form-group'>
                  <label>Confirm Password</label>
                  <div className='auth-input-wrapper'>
                    <FaLock className='input-icon' />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder='Repeat password'
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                    />
                    {passwordsMatch && (
                      <span style={{ position: 'absolute', right: 12, color: '#1db954', fontSize: 15 }}>
                        <FaCircleCheck />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type='submit'
                className='auth-submit-btn'
                disabled={regLoading}
                style={{ marginTop: 4 }}
              >
                {regLoading ? 'Creating Account...' : (
                  <>
                    <FaUserPlus />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
});

LoginModal.displayName = 'LoginModal';
