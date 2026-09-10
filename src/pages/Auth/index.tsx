import { FC, memo, useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { message } from 'antd';
import {
  FaHeadphones,
  FaUser,
  FaLock,
  FaEnvelope,
  FaIdCard,
  FaEye,
  FaEyeSlash,
  FaShieldHalved,
  FaMusic,
  FaMicrophone,
  FaSliders,
  FaListUl,
  FaCheck,
  FaCircleCheck,
  FaCircleExclamation,
  FaArrowRightToBracket,
  FaUserPlus,
  FaCompass,
} from 'react-icons/fa6';

// Redux
import { useAppDispatch, useAppSelector } from '../../store/store';
import { loginUser, registerUser, loginToSpotify, authActions } from '../../store/slices/auth';

export interface AuthPageProps {
  container?: React.RefObject<HTMLDivElement | null>;
  defaultMode?: 'login' | 'register';
}

const AuthPage: FC<AuthPageProps> = memo(({ defaultMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = Boolean(user && user.id && user.id !== 'guest');

  // Determine active tab from route or prop
  const isRegisterRoute = location.pathname.includes('signup') || location.pathname.includes('register') || defaultMode === 'register';
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(isRegisterRoute ? 'register' : 'login');

  useEffect(() => {
    if (location.pathname.includes('signup') || location.pathname.includes('register')) {
      setActiveTab('register');
    } else if (location.pathname.includes('login')) {
      setActiveTab('login');
    }
  }, [location.pathname]);

  // If already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Sign In Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

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

  // Handle Login Submit
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim()) {
      setLoginError('Please enter your username or email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const result = await dispatch(
        loginUser({
          username: loginUsername.trim(),
          password: loginPassword,
        })
      ).unwrap();

      message.success(`Welcome back, ${result.user?.display_name || result.user?.username || 'User'}!`);
      navigate('/', { replace: true });
    } catch (err: any) {
      if (typeof err === 'string') {
        setLoginError(err);
      } else if (err?.error) {
        setLoginError(err.error);
      } else {
        setLoginError('Invalid username/email or password. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim()) {
      setRegError('Please choose a username.');
      return;
    }
    if (regUsername.trim().length < 3) {
      setRegError('Username must be at least 3 characters long.');
      return;
    }
    if (!regPassword) {
      setRegError('Please enter a password.');
      return;
    }
    if (regPassword.length < 4) {
      setRegError('Password must be at least 4 characters long.');
      return;
    }
    if (regConfirmPassword && regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setRegError('Please agree to the Terms of Service to continue.');
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

      message.success(`Account created successfully! Welcome, ${result.user?.display_name || 'User'}!`);
      navigate('/', { replace: true });
    } catch (err: any) {
      if (typeof err === 'string') {
        setRegError(err);
      } else if (err?.username) {
        setRegError(Array.isArray(err.username) ? err.username[0] : 'Username is already taken.');
      } else if (err?.email) {
        setRegError(Array.isArray(err.email) ? err.email[0] : 'Email is invalid or already in use.');
      } else {
        setRegError('Registration failed. Please check your information and try again.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  // Switch tab helper
  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setLoginError(null);
    setRegError(null);
    if (tab === 'login') {
      navigate('/login', { replace: true });
    } else {
      navigate('/signup', { replace: true });
    }
  };

  return (
    <div className='auth-page-container'>
      <div className='auth-card-wrapper'>
        {/* Left Side: Brand Showcase & Perks */}
        <aside className='auth-branding-sidebar'>
          <div>
            <div className='auth-brand-header'>
              <div className='brand-logo-icon'>
                <img src='/logo.png' alt='Sportify Logo' style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className='brand-text'>
                <h1>Sportify</h1>
                <span>Audio Redefined</span>
              </div>
            </div>

            <div className='auth-equalizer'>
              <div className='eq-bar'></div>
              <div className='eq-bar'></div>
              <div className='eq-bar'></div>
              <div className='eq-bar'></div>
              <div className='eq-bar'></div>
            </div>

            <div className='auth-perks-list'>
              <div className='perk-item'>
                <div className='perk-icon-wrap'>
                  <FaMusic />
                </div>
                <div className='perk-text'>
                  <h4>Unlimited High-Quality Audio</h4>
                  <p>Stream millions of YouTube music tracks in high-fidelity audio.</p>
                </div>
              </div>

              <div className='perk-item'>
                <div className='perk-icon-wrap'>
                  <FaMicrophone />
                </div>
                <div className='perk-text'>
                  <h4>Real-time Karaoke & Lyrics</h4>
                  <p>Sing along with synchronized lyrics, vocal pitch helper, and live audio.</p>
                </div>
              </div>

              <div className='perk-item'>
                <div className='perk-icon-wrap'>
                  <FaSliders />
                </div>
                <div className='perk-text'>
                  <h4>Audio DSP Studio</h4>
                  <p>Bass boost, 3D spatial sound, vocal remover, and equalizer filters.</p>
                </div>
              </div>

              <div className='perk-item'>
                <div className='perk-icon-wrap'>
                  <FaListUl />
                </div>
                <div className='perk-text'>
                  <h4>Custom Playlists & Library</h4>
                  <p>Save favorite tracks, build collections, and follow your top artists.</p>
                </div>
              </div>
            </div>
          </div>

          <div className='auth-sidebar-footer'>
            <div className='secure-badge'>
              <FaShieldHalved />
              <span>256-bit Encrypted Audio API</span>
            </div>
            <span>v2.0</span>
          </div>
        </aside>

        {/* Right Side: Auth Forms */}
        <main className='auth-form-panel'>
          <div className='auth-form-header'>
            <h2>{activeTab === 'login' ? 'Welcome Back' : 'Create an Account'}</h2>
            <p>
              {activeTab === 'login'
                ? 'Sign in to access your playlists, liked tracks, and audio settings.'
                : 'Sign up for free and unlock the ultimate music experience.'}
            </p>
          </div>

          {/* Pill Switcher */}
          <div className='auth-tabs-nav'>
            <button
              type='button'
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => handleTabChange('login')}
            >
              Sign In
            </button>
            <button
              type='button'
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => handleTabChange('register')}
            >
              Create Account
            </button>
          </div>

          {/* SIGN IN FORM */}
          {activeTab === 'login' && (
            <form className='auth-form' onSubmit={handleLoginSubmit}>
              {loginError && (
                <div className='auth-alert error'>
                  <FaCircleExclamation style={{ fontSize: 16, flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}

              <div className='form-group'>
                <label htmlFor='login-username'>Username or Email</label>
                <div className='auth-input-wrapper'>
                  <FaUser className='input-icon' />
                  <input
                    id='login-username'
                    type='text'
                    placeholder='e.g. music_lover or user@sportify.com'
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    autoComplete='username'
                    required
                  />
                </div>
              </div>

              <div className='form-group'>
                <label htmlFor='login-password'>Password</label>
                <div className='auth-input-wrapper'>
                  <FaLock className='input-icon' />
                  <input
                    id='login-password'
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder='Enter your password'
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete='current-password'
                    required
                  />
                  <button
                    type='button'
                    className='toggle-pwd-btn'
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className='auth-options-row'>
                <label className='checkbox-label'>
                  <input
                    type='checkbox'
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <span
                  className='forgot-link'
                  onClick={() => {
                    message.info('Please contact your administrator or create a new account.');
                  }}
                >
                  Forgot password?
                </span>
              </div>

              <button
                type='submit'
                className='auth-submit-btn'
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <FaArrowRightToBracket />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              <div className='auth-divider'>or continue with</div>

              <div className='auth-social-actions'>
                <button
                  type='button'
                  className='social-btn'
                  onClick={() => handleTabChange('register')}
                >
                  <FaUserPlus style={{ fontSize: 18, color: '#1db954' }} />
                  <span>Create New Account</span>
                </button>

                <button
                  type='button'
                  className='social-btn'
                  onClick={() => {
                    navigate('/');
                  }}
                >
                  <FaCompass style={{ fontSize: 16, color: '#10b981' }} />
                  <span>Explore as Guest</span>
                </button>
              </div>
            </form>
          )}

          {/* CREATE ACCOUNT FORM */}
          {activeTab === 'register' && (
            <form className='auth-form' onSubmit={handleRegisterSubmit}>
              {regError && (
                <div className='auth-alert error'>
                  <FaCircleExclamation style={{ fontSize: 16, flexShrink: 0 }} />
                  <span>{regError}</span>
                </div>
              )}

              <div className='form-row-2'>
                <div className='form-group'>
                  <label htmlFor='reg-username'>
                    Username <span style={{ color: '#1db954' }}>*</span>
                  </label>
                  <div className='auth-input-wrapper'>
                    <FaUser className='input-icon' />
                    <input
                      id='reg-username'
                      type='text'
                      placeholder='Unique username'
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      autoComplete='username'
                      required
                    />
                  </div>
                </div>

                <div className='form-group'>
                  <label htmlFor='reg-display-name'>Display Name</label>
                  <div className='auth-input-wrapper'>
                    <FaIdCard className='input-icon' />
                    <input
                      id='reg-display-name'
                      type='text'
                      placeholder='Your Name or Alias'
                      value={regDisplayName}
                      onChange={(e) => setRegDisplayName(e.target.value)}
                      autoComplete='name'
                    />
                  </div>
                </div>
              </div>

              <div className='form-group'>
                <label htmlFor='reg-email'>
                  Email Address <span className='label-hint'>(Optional)</span>
                </label>
                <div className='auth-input-wrapper'>
                  <FaEnvelope className='input-icon' />
                  <input
                    id='reg-email'
                    type='email'
                    placeholder='yourname@example.com'
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    autoComplete='email'
                  />
                </div>
              </div>

              <div className='form-row-2'>
                <div className='form-group'>
                  <label htmlFor='reg-password'>
                    Password <span style={{ color: '#1db954' }}>*</span>
                  </label>
                  <div className='auth-input-wrapper'>
                    <FaLock className='input-icon' />
                    <input
                      id='reg-password'
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder='At least 4 characters'
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete='new-password'
                      required
                    />
                    <button
                      type='button'
                      className='toggle-pwd-btn'
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
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
                  <label htmlFor='reg-confirm-password'>
                    Confirm Password
                  </label>
                  <div className='auth-input-wrapper'>
                    <FaLock className='input-icon' />
                    <input
                      id='reg-confirm-password'
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder='Repeat password'
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      autoComplete='new-password'
                    />
                    {passwordsMatch && (
                      <span style={{ position: 'absolute', right: 12, color: '#1db954', fontSize: 16 }}>
                        <FaCircleCheck />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className='auth-options-row' style={{ marginTop: 2 }}>
                <label className='checkbox-label' style={{ fontSize: '0.78rem' }}>
                  <input
                    type='checkbox'
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span>
                    I agree to the <span style={{ color: '#1db954' }}>Terms of Service</span> and <span style={{ color: '#1db954' }}>Privacy Policy</span>.
                  </span>
                </label>
              </div>

              <button
                type='submit'
                className='auth-submit-btn'
                disabled={regLoading}
              >
                {regLoading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <FaUserPlus />
                    <span>Create Account & Start Listening</span>
                  </>
                )}
              </button>

              <div className='auth-divider'>or explore instantly</div>

              <div className='auth-social-actions'>
                <button
                  type='button'
                  className='social-btn'
                  onClick={() => {
                    navigate('/');
                  }}
                >
                  <FaCompass style={{ fontSize: 16, color: '#10b981' }} />
                  <span>Explore as Guest</span>
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
});

AuthPage.displayName = 'AuthPage';

export default AuthPage;
