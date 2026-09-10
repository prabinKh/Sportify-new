import axios from '../axios';

export interface UserSummary {
  id: number;
  username: string;
  display_name: string;
  avatar: string;
  friend_status?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  request_id?: number;
  unread_messages?: number;
  unread_count?: number;
  last_message?: DirectMessage | null;
}

export interface FriendRequest {
  id: number;
  sender: UserSummary;
  receiver: UserSummary;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface DirectMessage {
  id: number;
  sender: UserSummary;
  receiver: UserSummary;
  text: string;
  read: boolean;
  created_at: string;
}

export const socialService = {
  /** Search users by username */
  searchUsers: async (q: string): Promise<UserSummary[]> => {
    const res = await axios.get(`/api/social/users/search/?q=${encodeURIComponent(q)}`);
    return res.data;
  },

  /** List accepted friends */
  getFriends: async (): Promise<UserSummary[]> => {
    const res = await axios.get('/api/social/friends/');
    return res.data;
  },

  /** List incoming pending friend requests */
  getPendingRequests: async (): Promise<FriendRequest[]> => {
    const res = await axios.get('/api/social/requests/');
    return res.data;
  },

  /** Send a friend request */
  sendRequest: async (toUserId: number): Promise<FriendRequest> => {
    const res = await axios.post('/api/social/requests/', { to_user_id: toUserId });
    return res.data;
  },

  /** Accept or reject a friend request */
  respondToRequest: async (requestId: number, action: 'accept' | 'reject'): Promise<FriendRequest> => {
    const res = await axios.patch(`/api/social/requests/${requestId}/`, { action });
    return res.data;
  },

  /** Get all DM conversations (friends list with last message) */
  getConversations: async (): Promise<UserSummary[]> => {
    const res = await axios.get('/api/social/conversations/');
    return res.data;
  },

  /** Get messages with a specific user */
  getMessages: async (userId: number): Promise<DirectMessage[]> => {
    const res = await axios.get(`/api/social/messages/${userId}/`);
    return res.data;
  },

  /** Send a DM */
  sendMessage: async (userId: number, text: string): Promise<DirectMessage> => {
    const res = await axios.post(`/api/social/messages/${userId}/`, { text });
    return res.data;
  },
};
