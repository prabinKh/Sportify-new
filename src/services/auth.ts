import type { User } from '../interfaces/user';

const fetchUser = async () => ({
  data: {
    id: 'youtube_user',
    display_name: 'YouTube Listener',
    email: 'user@youtube-audio.local',
    images: [{ url: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' }],
  } as User,
});

export const authService = {
  fetchUser,
};

