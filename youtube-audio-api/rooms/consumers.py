import json
import time
from channels.generic.websocket import AsyncWebsocketConsumer

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code'].upper()
        self.room_group_name = f'room_{self.room_code}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket (Clock calibration)
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            action_type = text_data_json.get('type')
            
            if action_type == 'ping':
                # Used by client to measure network latency and offset against server clock
                # server_time is returned in milliseconds to match JS Date.now()
                server_time_ms = int(time.time() * 1000)
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'server_time': server_time_ms,
                    'client_time': text_data_json.get('client_time')
                }))
        except json.JSONDecodeError:
            pass

    # Receive message from room group (Triggered by Django Views)
    async def playback_event(self, event):
        """
        Broadcasts playback events like 'play', 'pause', 'seek', 'change_track' 
        to the websocket client immediately.
        """
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event['payload']))
