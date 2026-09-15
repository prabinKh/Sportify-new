import { API_BASE_URL } from './axios';

export const secondsToTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${Math.round(remainingSeconds)}`;
};

export const msToTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return secondsToTime(seconds);
};

export const formatEpisodeDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${seconds} sec`;
};

export const normalizeMediaUrl = (url?: string, defaultFallback = ''): string => {
  if (!url) return defaultFallback;

  const baseUrl = API_BASE_URL.replace(/\/+$/, '');

  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  if (/^https?:\/\/[^/]+:8000/i.test(url)) {
    return url.replace(/^https?:\/\/[^/]+:8000/i, baseUrl);
  }
  return url;
};

export const formatLocalTrack = (track: any): any => {
  if (!track) return null;
  const trackId = String(track.id || track.pk || '1');
  const artistId = String(track.artist_id || track.youtube_channel?.id || track.artists?.[0]?.id || '1');
  const artistName = track.artist_name || track.youtube_channel?.name || track.artists?.[0]?.name || 'YouTube Artist';
  
  const rawArtwork = track.thumbnail || track.artist_picture || track.album?.images?.[0]?.url;
  const artwork = rawArtwork
    ? normalizeMediaUrl(rawArtwork)
    : 'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4';
  
  const rawAudio = track.audio_file || track.audio_url || track.url || '';
  const audioFile = normalizeMediaUrl(rawAudio);

  return {
    id: trackId,
    type: 'track',
    name: track.name || track.title || 'Untitled Track',
    uri: track.uri?.startsWith('spotify:track:') ? track.uri : `spotify:track:${trackId}`,
    duration_ms: track.duration_ms || (track.duration_seconds || 180) * 1000,
    artists: track.artists && track.artists.length ? track.artists : [
      {
        id: artistId,
        name: artistName,
        type: 'artist',
        uri: `spotify:artist:${artistId}`,
      },
    ],
    album: track.album ? {
      ...track.album,
      id: String(track.album.id || artistId),
      name: track.album.name || artistName || 'Single',
      type: 'album',
      uri: track.album.uri || `spotify:album:${track.album.id || artistId}`,
      images: track.album.images?.length ? track.album.images : [{ url: artwork, height: 300, width: 300 }],
    } : {
      id: artistId,
      name: artistName || 'Single',
      type: 'album',
      uri: `spotify:album:${artistId}`,
      images: [{ url: artwork, height: 300, width: 300 }],
      album_type: 'single',
      artists: [
        {
          id: artistId,
          name: artistName,
          type: 'artist',
          uri: `spotify:artist:${artistId}`,
        },
      ],
    },
    audio_file: audioFile,
    saved: track.saved ?? (track.is_favorite || false),
    downloaded_at: track.downloaded_at || track.created_at || null,
    created_at: track.created_at || null,
  };
};

export const formatLocalArtist = (artist: any): any => {
  const profilePic = artist.profile_picture ? normalizeMediaUrl(artist.profile_picture) : null;
  const thumb = artist.audio_files?.[0]?.thumbnail ? normalizeMediaUrl(artist.audio_files[0].thumbnail) : null;

  return {
    id: String(artist.id),
    name: artist.name,
    type: 'artist',
    uri: `spotify:artist:${artist.id}`,
    images: profilePic
      ? [{ url: profilePic, height: 300, width: 300 }]
      : thumb
      ? [{ url: thumb, height: 300, width: 300 }]
      : [{ url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', height: 300, width: 300 }],
    followers: { total: artist.audio_count || 0 },
    genres: ['YouTube Audio'],
  };
};

export const formatLocalPlaylist = (playlist: any): any => {
  if (!playlist) return null;
  const plId = String(playlist.id);
  const rawArtwork =
    playlist.tracks?.[0]?.thumbnail ||
    playlist.tracks?.[0]?.album?.images?.[0]?.url ||
    playlist.images?.[0]?.url;
  const artwork = rawArtwork
    ? normalizeMediaUrl(rawArtwork)
    : 'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4';

  const isPublic = playlist.is_public !== undefined ? playlist.is_public : (playlist.public !== undefined ? playlist.public : true);
  const isOwn = !playlist.channel_id;

  return {
    id: plId,
    type: 'playlist',
    uri: `spotify:playlist:${plId}`,
    name: playlist.name || 'Playlist',
    description: playlist.description || (playlist.channel_name ? `Playlist by ${playlist.channel_name}` : ''),
    images: [{ url: artwork, height: 300, width: 300 }],
    tracks: {
      total: playlist.tracks_count || playlist.tracks?.length || 0,
      items: playlist.tracks?.map((t: any) => ({ track: formatLocalTrack(t), added_at: t.downloaded_at })) || [],
    },
    owner: playlist.channel_name
      ? { display_name: playlist.channel_name, id: String(playlist.channel_id) }
      : playlist.owner_name
      ? { display_name: playlist.owner_name, id: String(playlist.owner_id || '') }
      : (playlist.owner || { display_name: 'You', id: 'youtube_user' }),
    channel_id: playlist.channel_id,
    channel_name: playlist.channel_name,
    is_own: isOwn,
    collaborative: false,
    public: isPublic,
    is_public: isPublic,
  };
};


