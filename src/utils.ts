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
  const artwork = track.thumbnail || track.artist_picture || track.album?.images?.[0]?.url || '';

  return {
    id: trackId,
    name: track.name || track.title || 'Untitled Track',
    uri: track.uri?.startsWith('spotify:track:') ? track.uri : `spotify:track:${trackId}`,
    duration_ms: track.duration_ms || (track.duration_seconds || 180) * 1000,
    artists: track.artists && track.artists.length ? track.artists : [
      {
        id: artistId,
        name: artistName,
        uri: `spotify:artist:${artistId}`,
      },
    ],
    album: track.album || {
      id: artistId,
      name: artistName || 'Single',
      images: [{ url: artwork, height: 300, width: 300 }],
      album_type: 'single',
      artists: [
        {
          id: artistId,
          name: artistName,
        },
      ],
    },
    audio_file: track.audio_file || track.audio_url || track.url || '',
    saved: track.saved ?? (track.is_favorite || false),
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

export const formatLocalPlaylist = (playlist: any): any => ({
  id: String(playlist.id),
  name: playlist.name,
  description: playlist.description || '',
  images: playlist.tracks?.[0]?.thumbnail ? [{ url: playlist.tracks[0].thumbnail }] : [{ url: '' }],
  tracks: {
    total: playlist.tracks_count || playlist.tracks?.length || 0,
    items: playlist.tracks?.map((t: any) => ({ track: formatLocalTrack(t), added_at: t.downloaded_at })) || [],
  },
  owner: { display_name: 'You', id: 'youtube_user' },
  collaborative: false,
});

