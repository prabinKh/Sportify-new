import React, { FC, memo, useEffect, useMemo, useState, RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FaListUl, 
  FaMagnifyingGlass, 
  FaShuffle, 
  FaPlus, 
  FaUser, 
  FaMicrophone,
  FaXmark
} from 'react-icons/fa6';
import { Space, message } from 'antd';

// Redux & Services
import { useAppDispatch, useAppSelector } from '../../store/store';
import { playlistService } from '../../services/playlists';
import { fetchMyPlaylists } from '../../store/slices/yourLibrary';
import { uiActions } from '../../store/slices/ui';
import { GridItemList } from '../../components/Lists/list';
import { PlaylistCard } from '../../components/Lists/GridCards';
import type { Playlist } from '../../interfaces/playlists';

interface PlaylistsPageProps {
  container?: RefObject<HTMLDivElement | null>;
}

// Utility for shuffling an array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const PlaylistsPage: FC<PlaylistsPageProps> = memo(() => {
  const { t } = useTranslation(['navbar', 'playlist', 'home']);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const [allPlaylists, setAllPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'OWN' | 'ARTISTS'>('ALL');
  const [randomSeed, setRandomSeed] = useState(0);

  // Fetch all playlists
  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const res = await playlistService.getMyPlaylists();
      setAllPlaylists(res.data.items || []);
    } catch (err) {
      console.error('Error loading playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  // Separate Own Playlists vs Artist Playlists
  const { ownPlaylists, artistPlaylists } = useMemo(() => {
    const own: any[] = [];
    const artists: any[] = [];

    allPlaylists.forEach((pl) => {
      // If channel_id is null/undefined or is_own is true, it's user's own playlist
      if (pl.is_own || !pl.channel_id) {
        own.push(pl);
      } else {
        artists.push(pl);
      }
    });

    return { ownPlaylists: own, artistPlaylists: artists };
  }, [allPlaylists]);

  // Randomize artist playlists
  const randomizedArtistPlaylists = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = randomSeed;
    return shuffleArray(artistPlaylists);
  }, [artistPlaylists, randomSeed]);

  // Handle Create Playlist
  const handleCreatePlaylist = () => {
    if (!user) return dispatch(uiActions.openLoginTooltip());
    playlistService.createPlaylist(user.id, { name: 'My Playlist' }).then((res) => {
      message.success(t('Playlist created'));
      dispatch(fetchMyPlaylists());
      loadPlaylists();
      navigate(`/playlist/${res.data.id}`);
    });
  };

  // Filtered lists based on search query
  const query = search.trim().toLowerCase();

  const filteredOwn = useMemo(() => {
    if (!query) return ownPlaylists;
    return ownPlaylists.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [ownPlaylists, query]);

  const filteredArtists = useMemo(() => {
    if (!query) return randomizedArtistPlaylists;
    return randomizedArtistPlaylists.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.channel_name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [randomizedArtistPlaylists, query]);

  const totalResults = filteredOwn.length + filteredArtists.length;

  return (
    <div
      style={{
        padding: '28px 36px 80px',
        minHeight: '100%',
        background: 'linear-gradient(180deg, rgba(20, 83, 45, 0.4) 0%, rgba(18, 18, 18, 0.95) 300px)',
      }}
    >
      {/* Top Hero Banner */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
              }}
            >
              <FaListUl size={26} color='#ffffff' />
            </div>
            <div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#6ee7b7',
                }}
              >
                Music Collection
              </span>
              <h1
                style={{
                  fontSize: '40px',
                  fontWeight: 800,
                  margin: 0,
                  color: '#ffffff',
                  lineHeight: 1.1,
                }}
              >
                Playlists
              </h1>
            </div>
          </div>

          {/* Create Playlist Button */}
          <button
            onClick={handleCreatePlaylist}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '9999px',
              background: '#1ed760',
              color: '#000000',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, background 0.15s ease',
              boxShadow: '0 4px 16px rgba(30, 215, 96, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.background = '#22e366';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#1ed760';
            }}
          >
            <FaPlus size={14} />
            <span>Create Playlist</span>
          </button>
        </div>
        <p style={{ color: '#b3b3b3', fontSize: '14px', margin: '8px 0 0' }}>
          Explore your custom created playlists and discover curated playlists from artists.
        </p>
      </div>

      {/* Filter Tabs, Shuffle & Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Space size={10} wrap>
          <button
            onClick={() => setActiveTab('ALL')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
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
            <FaListUl size={13} />
            <span>All Playlists ({allPlaylists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('OWN')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '9999px',
              border: activeTab === 'OWN' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
              background: activeTab === 'OWN' ? '#10b981' : 'rgba(255, 255, 255, 0.07)',
              color: activeTab === 'OWN' ? '#000000' : '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <FaUser size={12} />
            <span>Your Playlists ({ownPlaylists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ARTISTS')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '9999px',
              border: activeTab === 'ARTISTS' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
              background: activeTab === 'ARTISTS' ? '#3b82f6' : 'rgba(255, 255, 255, 0.07)',
              color: activeTab === 'ARTISTS' ? '#000000' : '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <FaMicrophone size={12} />
            <span>Artist Playlists ({artistPlaylists.length})</span>
          </button>

          {/* Shuffle button to re-roll random artist playlists */}
          <button
            onClick={() => setRandomSeed((prev) => prev + 1)}
            title='Shuffle artist playlists randomly'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.07)',
              color: '#b3b3b3',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#b3b3b3';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
            }}
          >
            <FaShuffle size={12} />
            <span>Shuffle</span>
          </button>
        </Space>

        {/* Real-time Search Input */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minWidth: '280px',
          }}
        >
          <FaMagnifyingGlass
            size={14}
            style={{
              position: 'absolute',
              left: '14px',
              color: '#a1a1aa',
              pointerEvents: 'none',
            }}
          />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search playlists or artists...'
            style={{
              width: '100%',
              padding: '9px 36px 9px 38px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.16)';
              e.target.style.borderColor = '#ffffff';
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <FaXmark size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content Sections */}
      {loading ? (
        <div style={{ color: '#b3b3b3', padding: '40px 0', textAlign: 'center' }}>
          Loading playlists...
        </div>
      ) : totalResults === 0 ? (
        /* Empty Search / No Playlists State */
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
          <FaListUl size={36} color='#52525b' style={{ marginBottom: '14px' }} />
          <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
            {search ? 'No Playlists Matched' : 'No Playlists Found'}
          </h3>
          <p style={{ color: '#a1a1aa', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
            {search
              ? `No playlists matched "${search}". Try searching with another keyword.`
              : 'Start by creating your own playlist or importing YouTube channels.'}
          </p>
          {search ? (
            <button
              onClick={() => setSearch('')}
              style={{
                padding: '9px 20px',
                borderRadius: '9999px',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Clear Search
            </button>
          ) : (
            <button
              onClick={handleCreatePlaylist}
              style={{
                padding: '9px 20px',
                borderRadius: '9999px',
                background: '#1ed760',
                color: '#000000',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Create Playlist
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* 1. First Section: OWN CREATED PLAYLISTS (Displayed in 3 columns) */}
          {(activeTab === 'ALL' || activeTab === 'OWN') && filteredOwn.length > 0 && (
            <div style={{ marginBottom: '44px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <h2
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                      letterSpacing: '-0.4px',
                    }}
                  >
                    Your Created Playlists
                  </h2>
                  <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '4px 0 0' }}>
                    Custom playlists created by you ({filteredOwn.length})
                  </p>
                </div>
              </div>

              {/* Explicit 3-column responsive layout for Own Playlists */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '20px',
                }}
                className='own-playlists-3-col-grid'
              >
                {filteredOwn.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      transition: 'background 0.2s ease, transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <PlaylistCard item={item as Playlist} />
                  </div>
                ))}

                {/* Convenient "+ Create Another" card */}
                {!search && (
                  <div
                    onClick={handleCreatePlaylist}
                    style={{
                      border: '2px dashed rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      minHeight: '220px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: '20px',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1ed760';
                      e.currentTarget.style.background = 'rgba(30, 215, 96, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <FaPlus size={18} color='#ffffff' />
                    </div>
                    <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '15px' }}>
                      Create New Playlist
                    </span>
                    <span style={{ color: '#a1a1aa', fontSize: '12px', marginTop: '4px' }}>
                      Build your own collection
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Second Section: ARTIST PLAYLISTS (Displayed Randomly) */}
          {(activeTab === 'ALL' || activeTab === 'ARTISTS') && filteredArtists.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <h2
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                      letterSpacing: '-0.4px',
                    }}
                  >
                    Artist Playlists
                  </h2>
                  <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '4px 0 0' }}>
                    Curated playlists from subscribed artists, shuffled randomly ({filteredArtists.length})
                  </p>
                </div>

                <button
                  onClick={() => setRandomSeed((prev) => prev + 1)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#a1a1aa',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.borderColor = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#a1a1aa';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <FaShuffle size={12} />
                  <span>Reshuffle</span>
                </button>
              </div>

              <GridItemList
                multipleRows
                items={filteredArtists}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

PlaylistsPage.displayName = 'PlaylistsPage';

export default PlaylistsPage;
