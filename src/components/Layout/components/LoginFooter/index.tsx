import { memo } from 'react';
import { WhiteButton } from '../../../Button';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../../store/store';
import { uiActions } from '../../../../store/slices/ui';
import useIsMobile from '../../../../utils/isMobile';

export const LoginFooter = memo(() => {
  const isMobile = useIsMobile();
  const [t] = useTranslation(['home']);
  const dispatch = useAppDispatch();

  if (isMobile) return null;

  return (
    <div className='login-footer' style={{ margin: '0px 10px' }}>
      <div className='login-container'>
        <div>
          <p className='title'>{t('Preview')}</p>
          <p className='description'>{t('Log In to access all the features of the app')}.</p>
        </div>

        <WhiteButton
          title={t('Log In')}
          onClick={() => dispatch(uiActions.openLoginModal('https://cdn-icons-png.flaticon.com/512/1384/1384060.png'))}
        />
      </div>
    </div>
  );
});
