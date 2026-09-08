import { memo, useEffect, useState } from 'react';
import SongView from './SongView';
import axios from '../../../axios';
import { formatLocalTrack } from '../../../utils';
import { SearchIcon, CloseIcon2 } from '../../../components/Icons';
import { useAppSelector } from '../../../store/store';
import type { Track } from '../../../interfaces/track';

export const PlaylistRecommendations = memo(() => {
  const playlist = useAppSelector((state) => state.playlist.playlist);
  const recommendations = useAppSelector((state) => state.playlist.recommedations);
  const canEdit = useAppSelector((state) => state.playlist.canEdit);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [fallbackTracks, setFallbackTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-fetch fallback tracks if recommendations are empty
    if (!recommendations.length) {
      axios
        .get('/api/tracks/')
        .then((res) => {
          const items = (res.data || []).map(formatLocalTrack).filter(Boolean);
          setFallbackTracks(items.slice(0, 10));
        })
        .catch(() => {});
    }
  }, [recommendations]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      axios
        .get(`/api/tracks/search/?q=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          const items = (res.data || []).map(formatLocalTrack).filter(Boolean);
          setSearchResults(items);
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  if (!playlist) return null;

  const isSearching = Boolean(query.trim());
  const displayTracks = isSearching
    ? searchResults
    : recommendations.length > 0
    ? recommendations.slice(0, 10)
    : fallbackTracks;

  return (
    <div className='playlist-find-songs playlist-recommendations'>
      <h1 className='playlist-find-songs__title'>
        {isSearching ? `Search results for “${query.trim()}”` : "Let's find something for your playlist"}
      </h1>

      <div className='playlist-find-songs__search-container'>
        <span className='search-icon'>
          <SearchIcon style={{ height: '1rem', width: '1rem' }} />
        </span>
        <input
          type='text'
          value={query}
          placeholder='Search for songs or artists'
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button
            type='button'
            className='clear-icon'
            onClick={() => setQuery('')}
            aria-label='Clear search'
          >
            <CloseIcon2 />
          </button>
        ) : null}
      </div>

      {!isSearching && (
        <span style={{ display: 'block', marginBottom: 12 }}>
          {playlist.tracks?.total ? `Recommended based on what's in this playlist` : 'Recommended tracks'}
        </span>
      )}

      {loading ? (
        <p style={{ color: '#b3b3b3', marginLeft: 15 }}>Searching...</p>
      ) : displayTracks.length > 0 ? (
        <div style={{ margin: 5, marginTop: 10 }}>
          {displayTracks.map((track, index) => (
            <SongView key={`rec-track-${track.id || index}-${index}`} song={track} />
          ))}
        </div>
      ) : isSearching ? (
        <p style={{ color: '#b3b3b3', marginLeft: 15 }}>No matching songs found.</p>
      ) : null}
    </div>
  );
});

