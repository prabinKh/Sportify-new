import time
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Room, RoomMember, RoomMessage
from .serializers import (
    RoomSerializer,
    RoomMemberSerializer,
    RoomMessageSerializer,
    RoomStateSerializer,
)
from downloader.models import MediaFile


class RoomListCreateAPIView(generics.ListCreateAPIView):
    """List public rooms or create a new listening room."""
    serializer_class = RoomSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()
        qs = Room.objects.filter(is_public=True).select_related('host', 'host__profile', 'current_track').prefetch_related('members')
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(code__iexact=q) | Q(host__username__icontains=q))
        return qs

    def create(self, request, *args, **kwargs):
        name = request.data.get('name', '').strip()
        if not name:
            name = f"{request.user.username}'s Jam Session"

        description = request.data.get('description', '').strip()
        is_public_raw = request.data.get('is_public', True)
        if isinstance(is_public_raw, str):
            is_public = is_public_raw.lower() not in ('false', '0', 'no')
        else:
            is_public = bool(is_public_raw)

        initial_track_id = request.data.get('track_id')
        current_track = None
        if initial_track_id:
            try:
                current_track = MediaFile.objects.filter(pk=initial_track_id).first()
            except (ValueError, TypeError):
                pass

        # If no track was specified, auto-pick the most recent downloaded track
        # so every new room starts with music immediately ready to play
        if current_track is None:
            current_track = (
                MediaFile.objects
                .filter(audio_file__isnull=False)
                .exclude(audio_file='')
                .order_by('-id')
                .first()
            )

        room = Room.objects.create(
            name=name,
            description=description,
            host=request.user,
            is_public=is_public,
            current_track=current_track,
            is_playing=False,
            position_seconds=0.0,
            position_updated_at=timezone.now(),
        )

        # Creator is the host
        RoomMember.objects.create(room=room, user=request.user, is_host=True)

        serializer = self.get_serializer(room, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JoinRoomAPIView(APIView):
    """Join a room by its 6-character code."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip().upper()
        if not code:
            return Response({'error': 'Room code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response({'error': 'Invalid room code. Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Add user to members if not already a member
        member, created = RoomMember.objects.get_or_create(
            room=room,
            user=request.user,
            defaults={'is_host': (request.user == room.host)}
        )
        if not created:
            member.last_seen = timezone.now()
            member.save(update_fields=['last_seen'])

        serializer = RoomSerializer(room, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoomDetailAPIView(generics.RetrieveDestroyAPIView):
    """Get full room details or delete a room."""
    serializer_class = RoomSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        lookup = self.kwargs.get('code_or_id')
        if str(lookup).isdigit():
            room = get_object_or_404(Room, pk=int(lookup))
        else:
            room = get_object_or_404(Room, code=str(lookup).upper())

        # Update member heartbeat
        if self.request.user.is_authenticated:
            RoomMember.objects.filter(room=room, user=self.request.user).update(last_seen=timezone.now())

        return room

    def delete(self, request, *args, **kwargs):
        room = self.get_object()
        if not request.user.is_authenticated or request.user != room.host:
            return Response({'error': 'Only the room host can delete this room.'}, status=status.HTTP_403_FORBIDDEN)
        room.delete()
        return Response({'message': 'Room deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_server_time(request):
    """High-precision NTP clock synchronization endpoint."""
    now_sec = time.time()
    return Response({
        'server_time': now_sec,
        'server_time_ms': int(now_sec * 1000)
    }, status=status.HTTP_200_OK)


class RoomPlaybackSyncAPIView(APIView):
    """
    Host playback control API:
    action: 'play' | 'pause' | 'seek' | 'change_track'
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, code_or_id):
        if str(code_or_id).isdigit():
            room = get_object_or_404(Room, pk=int(code_or_id))
        else:
            room = get_object_or_404(Room, code=str(code_or_id).upper())

        if request.user != room.host:
            return Response(
                {'error': 'Only the room host can control synchronized playback.'},
                status=status.HTTP_403_FORBIDDEN
            )

        action = request.data.get('action')
        position_raw = request.data.get('position_seconds')
        track_id = request.data.get('track_id')

        now = timezone.now()
        current_server_sec = time.time()
        start_at_server_time = None

        if track_id:
            try:
                track = MediaFile.objects.get(pk=track_id)
                room.current_track = track
            except MediaFile.DoesNotExist:
                pass

        if position_raw is not None:
            try:
                room.position_seconds = max(0.0, float(position_raw))
            except (ValueError, TypeError):
                pass

        if action == 'play':
            room.is_playing = True
            room.position_updated_at = now
            # Synchronized playback: schedule 350ms in future so all devices start at the exact same millisecond
            start_at_server_time = current_server_sec + 0.35
        elif action == 'heartbeat':
            if position_raw is not None:
                try:
                    room.position_seconds = max(0.0, float(position_raw))
                except (ValueError, TypeError):
                    pass
            room.position_updated_at = now
            start_at_server_time = None
        elif action == 'pause':
            if room.is_playing and position_raw is None:
                elapsed = (now - room.position_updated_at).total_seconds()
                room.position_seconds = max(0.0, room.position_seconds + elapsed)
            room.is_playing = False
            room.position_updated_at = now
            start_at_server_time = None
        elif action == 'seek':
            room.position_updated_at = now
            if room.is_playing:
                start_at_server_time = current_server_sec + 0.35
            else:
                start_at_server_time = None
        elif action == 'change_track':
            room.position_seconds = 0.0
            room.position_updated_at = now
            if request.data.get('auto_play', True):
                room.is_playing = True
                start_at_server_time = current_server_sec + 0.35
            else:
                room.is_playing = False
                start_at_server_time = None

        room.save()

        state_serializer = RoomStateSerializer(
            room,
            context={'request': request, 'start_at_server_time': start_at_server_time}
        )
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'room_{room.code}',
            {
                'type': 'playback_event',
                'payload': {
                    'action': action,
                    'state': state_serializer.data
                }
            }
        )

        return Response(state_serializer.data, status=status.HTTP_200_OK)


class RoomStateSyncAPIView(APIView):
    """Fast, lightweight room state sync endpoint for listener drift correction."""
    permission_classes = [AllowAny]

    def get(self, request, code_or_id):
        if str(code_or_id).isdigit():
            room = get_object_or_404(Room, pk=int(code_or_id))
        else:
            room = get_object_or_404(Room, code=str(code_or_id).upper())

        # Update listener last seen
        if request.user.is_authenticated:
            RoomMember.objects.filter(room=room, user=request.user).update(last_seen=timezone.now())

        serializer = RoomStateSerializer(room, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoomChatAPIView(APIView):
    """Get chat history or post a new message to the room."""
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request, code_or_id):
        if str(code_or_id).isdigit():
            room = get_object_or_404(Room, pk=int(code_or_id))
        else:
            room = get_object_or_404(Room, code=str(code_or_id).upper())

        since_id = request.query_params.get('since_id')
        qs = room.messages.select_related('user', 'user__profile').order_by('created_at')
        if since_id and since_id.isdigit():
            qs = qs.filter(id__gt=int(since_id))

        messages = qs[:100]
        serializer = RoomMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, code_or_id):
        if str(code_or_id).isdigit():
            room = get_object_or_404(Room, pk=int(code_or_id))
        else:
            room = get_object_or_404(Room, code=str(code_or_id).upper())

        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Make sure user is a member
        RoomMember.objects.get_or_create(
            room=room,
            user=request.user,
            defaults={'is_host': (request.user == room.host)}
        )

        msg = RoomMessage.objects.create(
            room=room,
            user=request.user,
            text=text,
        )

        serializer = RoomMessageSerializer(msg, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LeaveRoomAPIView(APIView):
    """Leave a room."""
    permission_classes = [IsAuthenticated]

    def post(self, request, code_or_id):
        if str(code_or_id).isdigit():
            room = get_object_or_404(Room, pk=int(code_or_id))
        else:
            room = get_object_or_404(Room, code=str(code_or_id).upper())

        RoomMember.objects.filter(room=room, user=request.user).delete()
        return Response({'message': 'Left room successfully.'}, status=status.HTTP_200_OK)
