import axios from '../axios';
import type { User } from '../interfaces/user';

const fetchUser = async () => {
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Token ' + token;
    }
    const res = await axios.get('/api/accounts/me/');
    return res;
  } catch {
    return {
      data: {
        id: 'guest',
        display_name: 'Guest Listener',
        email: 'guest@sportify.local',
        images: [{ url: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png', height: 300, width: 300 }],
      } as User,
    };
  }
};

const login = async (credentials: { username: string; password: string }) => {
  const res = await axios.post('/api/accounts/login/', credentials);
  if (res.data?.token) {
    localStorage.setItem('access_token', res.data.token);
    axios.defaults.headers.common['Authorization'] = 'Token ' + res.data.token;
  }
  return res.data;
};

const register = async (userData: { username: string; email?: string; password: string; display_name?: string }) => {
  const res = await axios.post('/api/accounts/register/', userData);
  if (res.data?.token) {
    localStorage.setItem('access_token', res.data.token);
    axios.defaults.headers.common['Authorization'] = 'Token ' + res.data.token;
  }
  return res.data;
};

const logout = async () => {
  try {
    await axios.post('/api/accounts/logout/');
  } catch { }
  localStorage.removeItem('access_token');
  delete axios.defaults.headers.common['Authorization'];
};

export const authService = {
  fetchUser,
  login,
  register,
  logout,
};
