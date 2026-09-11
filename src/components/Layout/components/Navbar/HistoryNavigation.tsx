import { Space } from 'antd';
import ForwardBackwardsButton from './ForwardBackwardsButton';
import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from '../../../Tooltip';

const HistoryNavigation = memo(() => {
  const { t } = useTranslation(['navbar']);

  return (
    <Space align='center' size={14}>
      <Tooltip placement='bottom' title={t('Home')}>
        <Link
          to='/'
          className='flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95'
          style={{
            textDecoration: 'none',
            cursor: 'pointer',
            padding: '3px',
            background: 'conic-gradient(from 0deg, #ef4444 0%, #3b82f6 25%, #22c55e 50%, #eab308 75%, #ef4444 100%)',
            borderRadius: '50%',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '2px',
            }}
          >
            <img
              src='/logo.png'
              alt='App Logo'
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        </Link>
      </Tooltip>

      <div className='flex flex-row items-center gap-2 h-full mobile-hidden'>
        <ForwardBackwardsButton flip />
        <ForwardBackwardsButton flip={false} />
      </div>
    </Space>
  );
});

export default HistoryNavigation;
