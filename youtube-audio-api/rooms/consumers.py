import json
import time
from channels.generic.websocket import AsyncWebsocketConsumer

# In-memory tracking of active clients and track buffer readiness per room
ROOM_CLIENTS = {}        # room_code → set of channel_names
ROOM_TRACK_READY = {}    # room_code → { track_id → set of channel_names }
ROOM_USER_NAMES = {}     # room_code → { channel_name → username }

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code'].upper()
        self.room_group_name = f'room_{self.room_code}'
        self.username = 'unknown'

        # Extract username from scope (Django auth or session)
        user = self.scope.get('user')
        if user and hasattr(user, 'username') and user.is_authenticated:
            self.username = user.username

        # Register client
        if self.room_code not in ROOM_CLIENTS:
            ROOM_CLIENTS[self.room_code] = set()
        ROOM_CLIENTS[self.room_code].add(self.channel_name)

        if self.room_code not in ROOM_TRACK_READY:
            ROOM_TRACK_READY[self.room_code] = {}

        if self.room_code not in ROOM_USER_NAMES:
            ROOM_USER_NAMES[self.room_code] = {}
        ROOM_USER_NAMES[self.room_code][self.channel_name] = self.username

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.broadcast_buffer_status()

    async def disconnect(self, close_code):
        # Unregister client
        if self.room_code in ROOM_CLIENTS:
            ROOM_CLIENTS[self.room_code].discard(self.channel_name)
            if not ROOM_CLIENTS[self.room_code]:
                ROOM_CLIENTS.pop(self.room_code, None)
                ROOM_TRACK_READY.pop(self.room_code, None)
                ROOM_USER_NAMES.pop(self.room_code, None)

        if self.room_code in ROOM_TRACK_READY:
            for track_id in list(ROOM_TRACK_READY[self.room_code].keys()):
                ROOM_TRACK_READY[self.room_code][track_id].discard(self.channel_name)

        if self.room_code in ROOM_USER_NAMES:
            ROOM_USER_NAMES[self.room_code].pop(self.channel_name, None)

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.broadcast_buffer_status()

    async def broadcast_buffer_status(self, track_id=None):
        """Broadcast current buffer readiness to every client in the room."""
        if self.room_code not in ROOM_CLIENTS:
            return
        total_clients = len(ROOM_CLIENTS.get(self.room_code, set()))
        if total_clients == 0:
            return

        tracks = [track_id] if track_id else list(ROOM_TRACK_READY.get(self.room_code, {}).keys())

        # Always build a name→channel reverse map for ready_usernames list
        user_names = ROOM_USER_NAMES.get(self.room_code, {})

        if not tracks:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'room_event',
                    'payload': {
                        'type': 'room_buffer_status',
                        'track_id': None,
                        'total_clients': total_clients,
                        'ready_clients': 0,
                        'all_ready': False,
                        'ready_usernames': [],
                    }
                }
            )
            return

        for t_id in tracks:
            ready_set = ROOM_TRACK_READY.get(self.room_code, {}).get(t_id, set())
            ready_clients = len(ready_set)
            all_ready = (ready_clients >= total_clients and total_clients > 0)
            ready_usernames = [user_names.get(ch, 'unknown') for ch in ready_set]

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'room_event',
                    'payload': {
                        'type': 'room_buffer_status',
                        'track_id': t_id,
                        'total_clients': total_clients,
                        'ready_clients': ready_clients,
                        'all_ready': all_ready,
                        'ready_usernames': ready_usernames,
                    }
                }
            )

    # Receive message from WebSocket client
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action_type = data.get('type')

            if action_type == 'ping':
                # NTP clock calibration response
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'server_time': int(time.time() * 1000),
                    'client_time': data.get('client_time'),
                }))

            elif action_type == 'track_ready':
                # Client signals it has fully buffered a specific track
                track_id = str(data.get('track_id', ''))
                if track_id:
                    if self.room_code not in ROOM_TRACK_READY:
                        ROOM_TRACK_READY[self.room_code] = {}
                    if track_id not in ROOM_TRACK_READY[self.room_code]:
                        ROOM_TRACK_READY[self.room_code][track_id] = set()
                    ROOM_TRACK_READY[self.room_code][track_id].add(self.channel_name)
                    await self.broadcast_buffer_status(track_id)

            elif action_type == 'reset_buffer':
                # Host changed the track → clear ALL previous track IDs and reset to 0 ready
                new_track_id = str(data.get('track_id', ''))
                if self.room_code in ROOM_TRACK_READY:
                    # Remove every stale track key except the new one
                    stale_ids = [t for t in list(ROOM_TRACK_READY[self.room_code].keys()) if t != new_track_id]
                    for stale in stale_ids:
                        del ROOM_TRACK_READY[self.room_code][stale]
                    # Reset ready set for the new track
                    if new_track_id:
                        ROOM_TRACK_READY[self.room_code][new_track_id] = set()
                await self.broadcast_buffer_status(new_track_id if new_track_id else None)

            elif action_type == 'volume_event':
                # Host broadcasts a suggested volume level (0.0 – 1.0) to all listeners
                volume = data.get('volume', 0.8)
                try:
                    volume = max(0.0, min(1.0, float(volume)))
                except (ValueError, TypeError):
                    volume = 0.8
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'room_event',
                        'payload': {
                            'type': 'volume_event',
                            'volume': volume,
                            'from_host': True,
                        }
                    }
                )

        except json.JSONDecodeError:
            pass

    async def room_event(self, event):
        """Forward room-level events to this WebSocket client."""
        await self.send(text_data=json.dumps(event['payload']))

    async def playback_event(self, event):
        """Forward playback state events broadcast from Django views."""
        await self.send(text_data=json.dumps(event['payload']))
