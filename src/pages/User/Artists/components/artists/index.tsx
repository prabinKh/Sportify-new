import { memo } from 'react';
import { Link } from 'react-router-dom';
import { FaUserPlus } from 'react-icons/fa6';

// Components
import { GridItemList } from '../../../../../components/Lists/list';

// Redux
import { useAppSelector } from '../../../../../store/store';
import { useTranslation } from 'react-i18next';

export const ArtistsProfileSection = memo(() => {
  const [t] = useTranslation(['profile']);
  const artists = useAppSelector((state) => state.profile.artists);

  if (!artists || artists.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
          Followed Artists
        </h2>
        <p style={{ color: '#b3b3b3', fontSize: '15px', marginBottom: '24px' }}>
          You are not following any artists yet. Click "Follow" on any artist's page to see them here.
        </p>
        <Link
          to='/'
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            color: '#000000',
            fontWeight: 700,
            padding: '12px 28px',
            borderRadius: '9999px',
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <FaUserPlus size={16} />
          <span>Explore Artists</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div>
        <GridItemList
          multipleRows
          items={artists}
          title='Followed Artists'
          subtitle={t('Only visible to you')}
        />
      </div>
    </div>
  );
});

