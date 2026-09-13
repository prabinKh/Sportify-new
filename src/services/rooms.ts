import axios, { API_BASE_URL } from '../axios';

export interface RoomMemberData {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  avatar: string;
  is_host: boolean;
  joined_at: string;
  last_seen: string;
}

export interface RoomMessageData {
  id: number;
  room_id: number;
  user_id: number;
  username: string;
  display_name: string;
  avatar: string;
  text: string;
  created_at: string;
}

export interface RoomData {
  id: number;
  code: string;
  name: string;
  description: string;
  host_id: number;
  host_name: string;
  host_avatar: string;
  current_track: any | null;
  is_playing: boolean;
  position_seconds: number;
  calculated_position: number;
  position_updated_at: string;
  server_timestamp: number;
  is_public: boolean;
  member_count: number;
  members: RoomMemberData[];
  recent_messages: RoomMessageData[];
  created_at: string;
  updated_at: string;
}

export interface RoomStateData {
  id: number;
  code: string;
  is_playing: boolean;
  position_seconds: number;
  calculated_position: number;
  position_updated_at: string;
  server_timestamp: number;
  current_track: any | null;
  member_count: number;
}

const getRooms = async (q?: string) => {
  const params = q ? { q } : {};
  const response = await axios.get<RoomData[]>('/api/rooms/', { params });
  return response.data;
};

const createRoom = async (data: {
  name: string;
  description?: string;
  is_public?: boolean;
  track_id?: number;
}) => {
  const response = await axios.post<RoomData>('/api/rooms/', data);
  return response.data;
};

const joinRoom = async (code: string) => {
  const response = await axios.post<RoomData>('/api/rooms/join/', { code });
  return response.data;
};

const getRoom = async (codeOrId: string) => {
  const response = await axios.get<RoomData>(`/api/rooms/${codeOrId}/`);
  return response.data;
};

const deleteRoom = async (codeOrId: string) => {
  const response = await axios.delete(`/api/rooms/${codeOrId}/`);
  return response.data;
};

const syncPlayback = async (
  codeOrId: string,
  data: {
    action: 'play' | 'pause' | 'seek' | 'change_track' | 'heartbeat';
    position_seconds?: number;
    track_id?: number;
    auto_play?: boolean;
  }
) => {
  const response = await axios.post<RoomStateData>(`/api/rooms/${codeOrId}/sync/`, data);
  return response.data;
};

const getRoomState = async (codeOrId: string) => {
  const response = await axios.get<RoomStateData>(`/api/rooms/${codeOrId}/state/`);
  return response.data;
};

const getRoomChat = async (codeOrId: string, sinceId?: number) => {
  const params = sinceId ? { since_id: sinceId } : {};
  const response = await axios.get<RoomMessageData[]>(`/api/rooms/${codeOrId}/chat/`, { params });
  return response.data;
};

const sendChatMessage = async (codeOrId: string, text: string) => {
  const response = await axios.post<RoomMessageData>(`/api/rooms/${codeOrId}/chat/`, { text });
  return response.data;
};

const leaveRoom = async (codeOrId: string) => {
  const response = await axios.post(`/api/rooms/${codeOrId}/leave/`);
  return response.data;
};

export const roomService = {
  getRooms,
  createRoom,
  joinRoom,
  getRoom,
  deleteRoom,
  syncPlayback,
  getRoomState,
  getRoomChat,
  sendChatMessage,
  leaveRoom,
};

export class JamSyncSocket {
  ws: WebSocket | null = null;
  code: string;
  onEvent: (event: any) => void;
  offset: number = 0;
  pingInterval: any = null;
  reconnectTimeout: any = null;
  isConnecting: boolean = false;

  constructor(code: string, onEvent: (event: any) => void) {
    this.code = code;
    this.onEvent = onEvent;
    this.connect();
  }

  connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;
    
    let wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/room/${this.code}/`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;
      // Start clock calibration loop
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping', client_time: Date.now() }));
        }
      }, 5000);
      
      // Initial ping
      this.ws.send(JSON.stringify({ type: 'ping', client_time: Date.now() }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          const now = Date.now();
          const latency = (now - data.client_time) / 2;
          this.offset = data.server_time - (data.client_time + latency);
        } else {
          this.onEvent(data);
        }
      } catch (e) {}
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.cleanup();
      // Auto-reconnect gracefully
      this.reconnectTimeout = setTimeout(() => this.connect(), 2000);
    };
  }

  cleanup() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  disconnect() {
    this.cleanup();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
  }
}

