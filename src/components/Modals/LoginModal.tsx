import { FC, memo, useCallback, useEffect, useState } from 'react';
import { Modal, Tabs, Input, Button, Alert, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import tinycolor from 'tinycolor2';
import { useTranslation } from 'react-i18next';

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
  const [t] = useTranslation(['home']);
  const isMobile = useIsMobile();

  const [open, setOpen] = useState<boolean>(false);
  const [color, setColor] = useState<string>(DEFAULT_PAGE_COLOR);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Sign In state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register state
  const [regUsername, setRegUsername] = useState<string>('');
  const [regDisplayName, setRegDisplayName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
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
      getImageAnalysis2(imgUrl).then((c) => {
        let colorObj = tinycolor(c);
        while (colorObj.isLight()) {
          colorObj = colorObj.darken(10);
        }
        setColor(colorObj.toHexString());
        setOpen(true);
      }).catch(() => {
        setOpen(true);
      });
    } else {
      setOpen(false);
    }
  }, [imgUrl]);

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
    if (!regUsername.trim() || !regPassword.trim()) {
      setRegError('Username and password are required.');
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
      width={780}
      open={open}
      footer={null}
      destroyOnClose
      onCancel={onClose}
      className='login-modal'
      wrapClassName='overlay-modal'
      style={{
        // @ts-ignore
        '--background-color': color,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 24,
          alignItems: 'stretch',
        }}
      >
        {/* Left Side: Artwork & Cover */}
        <div className='img-container' style={{ flex: '0 0 240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            alt='Cover'
            loading='lazy'
            src={imgUrl}
            style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 280, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
          />
        </div>

        {/* Right Side: Sign In / Sign Up Forms */}
        <div className='content-container' style={{ flex: 1, paddingRight: 8 }}>
          <h2 style={{ lineHeight: 1.3, marginBottom: 16 }}>{t('Sign in to your Sportify Account')}</h2>

          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            items={[
              {
                key: 'login',
                label: 'Sign In',
                children: (
                  <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    {loginError && <Alert message={loginError} type='error' showIcon closable onClose={() => setLoginError(null)} />}

                    <div>
                      <label style={{ color: '#b3b3b3', fontSize: '0.85rem', fontWeight: 600 }}>Username or Email</label>
                      <Input
                        prefix={<UserOutlined style={{ color: '#888' }} />}
                        placeholder='Enter username or email'
                        size='large'
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        style={{ marginTop: 4, background: '#121212', border: '1px solid #333', color: '#fff' }}
                      />
                    </div>

                    <div>
                      <label style={{ color: '#b3b3b3', fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
                      <Input.Password
                        prefix={<LockOutlined style={{ color: '#888' }} />}
                        placeholder='Enter password'
                        size='large'
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        style={{ marginTop: 4, background: '#121212', border: '1px solid #333', color: '#fff' }}
                      />
                    </div>

                    <Button
                      type='primary'
                      htmlType='submit'
                      size='large'
                      loading={loginLoading}
                      style={{
                        marginTop: 10,
                        background: '#1db954',
                        borderColor: '#1db954',
                        fontWeight: 700,
                        borderRadius: 30,
                        height: 44,
                      }}
                    >
                      Sign In
                    </Button>
                  </form>
                ),
              },
              {
                key: 'register',
                label: 'Create Account',
                children: (
                  <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {regError && <Alert message={regError} type='error' showIcon closable onClose={() => setRegError(null)} />}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ color: '#b3b3b3', fontSize: '0.82rem', fontWeight: 600 }}>Username *</label>
                        <Input
                          prefix={<UserOutlined style={{ color: '#888' }} />}
                          placeholder='Username'
                          size='large'
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          style={{ marginTop: 2, background: '#121212', border: '1px solid #333', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ color: '#b3b3b3', fontSize: '0.82rem', fontWeight: 600 }}>Display Name</label>
                        <Input
                          prefix={<IdcardOutlined style={{ color: '#888' }} />}
                          placeholder='Display Name'
                          size='large'
                          value={regDisplayName}
                          onChange={(e) => setRegDisplayName(e.target.value)}
                          style={{ marginTop: 2, background: '#121212', border: '1px solid #333', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ color: '#b3b3b3', fontSize: '0.82rem', fontWeight: 600 }}>Email Address</label>
                      <Input
                        prefix={<MailOutlined style={{ color: '#888' }} />}
                        placeholder='yourname@example.com'
                        size='large'
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        style={{ marginTop: 2, background: '#121212', border: '1px solid #333', color: '#fff' }}
                      />
                    </div>

                    <div>
                      <label style={{ color: '#b3b3b3', fontSize: '0.82rem', fontWeight: 600 }}>Password *</label>
                      <Input.Password
                        prefix={<LockOutlined style={{ color: '#888' }} />}
                        placeholder='At least 4 characters'
                        size='large'
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        style={{ marginTop: 2, background: '#121212', border: '1px solid #333', color: '#fff' }}
                      />
                    </div>

                    <Button
                      type='primary'
                      htmlType='submit'
                      size='large'
                      loading={regLoading}
                      style={{
                        marginTop: 8,
                        background: '#1db954',
                        borderColor: '#1db954',
                        fontWeight: 700,
                        borderRadius: 30,
                        height: 44,
                      }}
                    >
                      Create Account & Sign In
                    </Button>
                  </form>
                ),
              },
            ]}
          />

          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, textAlign: 'center' }}>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Or authorize with Spotify Web OAuth: </span>
            <Button
              type='link'
              size='small'
              style={{ color: '#1db954', fontWeight: 700 }}
              onClick={() => {
                dispatch(loginToSpotify());
              }}
            >
              Connect Spotify
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});

LoginModal.displayName = 'LoginModal';
