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
export const formatLocalTrack = (track: any): any => {
  if (!track) return null;
  const trackId = String(track.id || track.pk || '1');
  const artistId = String(track.artist_id || track.youtube_channel?.id || track.artists?.[0]?.id || '1');
  const artistName = track.artist_name || track.youtube_channel?.name || track.artists?.[0]?.name || 'YouTube Artist';
  const artwork = track.thumbnail || track.artist_picture || track.album?.images?.[0]?.url || 'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4';

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
    audio_file: track.audio_file || track.audio_url || track.url || '',
    saved: track.saved ?? (track.is_favorite || false),
    downloaded_at: track.downloaded_at || track.created_at || new Date().toISOString(),
  };
};

export const formatLocalArtist = (artist: any): any => ({
  id: String(artist.id),
  name: artist.name,
  type: 'artist',
  uri: `spotify:artist:${artist.id}`,
  images: artist.profile_picture
    ? [{ url: artist.profile_picture, height: 300, width: 300 }]
    : artist.audio_files?.[0]?.thumbnail
    ? [{ url: artist.audio_files[0].thumbnail, height: 300, width: 300 }]
    : [{ url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', height: 300, width: 300 }],
  followers: { total: artist.audio_count || 0 },
  genres: ['YouTube Audio'],
});

export const formatLocalPlaylist = (playlist: any): any => {
  if (!playlist) return null;
  const plId = String(playlist.id);
  const artwork =
    playlist.tracks?.[0]?.thumbnail ||
    playlist.tracks?.[0]?.album?.images?.[0]?.url ||
    playlist.images?.[0]?.url ||
    'https://community.spotify.com/t5/image/serverpage/image-id/25294i28328C78821614C4';

  return {
    id: plId,
    type: 'playlist',
    uri: `spotify:playlist:${plId}`,
    name: playlist.name || 'Playlist',
    description: playlist.description || '',
    images: [{ url: artwork, height: 300, width: 300 }],
    tracks: {
      total: playlist.tracks_count || playlist.tracks?.length || 0,
      items: playlist.tracks?.map((t: any) => ({ track: formatLocalTrack(t), added_at: t.downloaded_at })) || [],
    },
    owner: playlist.owner || { display_name: 'You', id: 'youtube_user' },
    collaborative: false,
    public: true,
  };
};

