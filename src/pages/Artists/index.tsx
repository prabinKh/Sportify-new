import React, { FC, memo, useEffect, useMemo, useState, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaMicrophone, FaUserCheck, FaMagnifyingGlass } from 'react-icons/fa6';
import { Row, Col, Space } from 'antd';

// Redux
import { useAppDispatch, useAppSelector } from '../../store/store';
import { yourLibraryActions } from '../../store/slices/yourLibrary';
import { profileActions } from '../../store/slices/profile';
import { userService } from '../../services/users';
import { GridItemList } from '../../components/Lists/list';
import type { Artist } from '../../interfaces/artist';

interface ArtistsPageProps {
  container?: RefObject<HTMLDivElement | null>;
}

export const ArtistsPage: FC<ArtistsPageProps> = memo(() => {
  const { t } = useTranslation(['navbar', 'home', 'profile']);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'ALL' | 'FOLLOWED'>('ALL');
  const [search, setSearch] = useState('');
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [followedList, setFollowedList] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  const followedArtists = useAppSelector((state) => state.yourLibrary.myArtists);
  const user = useAppSelector((state) => !!state.auth.user);

  useEffect(() => {
    dispatch(yourLibraryActions.fetchMyArtists());
    dispatch(profileActions.fetchMyArtists());

    userService.fetchFollowedArtists().then((res) => {
      setFollowedList(res.data.artists.items || []);
    });

    userService
      .fetchTopArtists({ limit: 100 })
      .then((res) => {
        setAllArtists(res.data.items || []);
      })
      .catch((err) => {
        console.error('Error fetching artists:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch]);

  const effectiveFollowed = useMemo(() => {
    return followedList.length ? followedList : followedArtists;
  }, [followedList, followedArtists]);

  const displayedArtists = useMemo(() => {
    const list = activeTab === 'FOLLOWED' ? effectiveFollowed : allArtists;
    if (!search.trim()) return list;
    return list.filter((artist) =>
      artist.name?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [activeTab, effectiveFollowed, allArtists, search]);

  return (
    <div
      style={{
        padding: '24px 32px 64px',
        minHeight: '100%',
        background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.45) 0%, rgba(18, 18, 18, 0.95) 280px)',
      }}
    >
      {/* Hero Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            }}
          >
            <FaMicrophone size={24} color='#ffffff' />
          </div>
          <div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#93c5fd',
              }}
            >
              Music Catalog
            </span>
            <h1
              style={{
                fontSize: '38px',
                fontWeight: 800,
                margin: 0,
                color: '#ffffff',
                lineHeight: 1.1,
              }}
            >
              Artists
            </h1>
          </div>
        </div>
        <p style={{ color: '#b3b3b3', fontSize: '14px', margin: 0 }}>
          Explore all artists or view the artists you follow.
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <Space size={10}>
          <button
            onClick={() => setActiveTab('ALL')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '9999px',
              border: activeTab === 'ALL' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
              background: activeTab === 'ALL' ? '#ffffff' : 'rgba(255, 255, 255, 0.07)',
              color: activeTab === 'ALL' ? '#000000' : '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <FaMicrophone size={13} />
            <span>All Artists ({allArtists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('FOLLOWED')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '9999px',
              border: activeTab === 'FOLLOWED' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
              background: activeTab === 'FOLLOWED' ? '#22c55e' : 'rgba(255, 255, 255, 0.07)',
              color: activeTab === 'FOLLOWED' ? '#000000' : '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <FaUserCheck size={13} />
            <span>Following ({effectiveFollowed.length})</span>
          </button>
        </Space>

        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minWidth: '240px',
          }}
        >
          <FaMagnifyingGlass
            size={14}
            style={{
              position: 'absolute',
              left: '12px',
              color: '#a1a1aa',
              pointerEvents: 'none',
            }}
          />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search artists...'
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              e.target.style.borderColor = '#ffffff';
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          />
        </div>
      </div>

      {/* Artists Grid */}
      {displayedArtists.length > 0 ? (
        <GridItemList
          multipleRows
          items={displayedArtists}
          title={activeTab === 'FOLLOWED' ? 'Followed Artists' : 'All Artists'}
        />
      ) : (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            marginTop: '16px',
          }}
        >
          <FaMicrophone size={36} color='#52525b' style={{ marginBottom: '14px' }} />
          <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
            {activeTab === 'FOLLOWED' ? 'No Followed Artists Yet' : 'No Artists Found'}
          </h3>
          <p style={{ color: '#a1a1aa', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
            {activeTab === 'FOLLOWED'
              ? 'Browse the catalog and click the Follow button on any artist to see them in your followed list.'
              : search
              ? `No artists matched "${search}". Try searching with a different name.`
              : 'There are no artists in the catalog yet.'}
          </p>
          {activeTab === 'FOLLOWED' && (
            <button
              onClick={() => {
                setActiveTab('ALL');
                setSearch('');
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '9999px',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Explore All Artists
            </button>
          )}
        </div>
      )}
    </div>
  );
});

ArtistsPage.displayName = 'ArtistsPage';

export default ArtistsPage;
