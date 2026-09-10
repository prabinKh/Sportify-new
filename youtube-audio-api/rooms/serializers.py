import time
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Room, RoomMember, RoomMessage
from downloader.serialization import LocalTrackSerializer


def _user_avatar(user, request=None):
    profile = getattr(user, 'profile', None)
    if profile:
        avatar = getattr(profile, 'avatar_url', None) or getattr(profile, 'avatar', None) or getattr(profile, 'profile_picture', None)
        if avatar:
            if hasattr(avatar, 'url'):
                url = avatar.url
            else:
                url = str(avatar)
            if url.startswith('http'):
                return url
            if request:
                return request.build_absolute_uri(url)
            return url
    return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'


class RoomMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    display_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = RoomMember
        fields = ['id', 'user_id', 'username', 'display_name', 'avatar', 'is_host', 'joined_at', 'last_seen']

    def get_display_name(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.display_name:
            return obj.user.profile.display_name
        return obj.user.username

    def get_avatar(self, obj):
        request = self.context.get('request')
        return _user_avatar(obj.user, request)


class RoomMessageSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    display_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = RoomMessage
        fields = ['id', 'room_id', 'user_id', 'username', 'display_name', 'avatar', 'text', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_display_name(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.display_name:
            return obj.user.profile.display_name
        return obj.user.username

    def get_avatar(self, obj):
        request = self.context.get('request')
        return _user_avatar(obj.user, request)


class RoomSerializer(serializers.ModelSerializer):
    host_id = serializers.IntegerField(source='host.id', read_only=True)
    host_name = serializers.SerializerMethodField()
    host_avatar = serializers.SerializerMethodField()
    current_track = LocalTrackSerializer(read_only=True)
    calculated_position = serializers.FloatField(read_only=True)
    server_timestamp = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    recent_messages = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'code', 'name', 'description',
            'host_id', 'host_name', 'host_avatar',
            'current_track', 'is_playing', 'position_seconds',
            'calculated_position', 'position_updated_at',
            'server_timestamp', 'is_public',
            'member_count', 'members', 'recent_messages',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'code', 'host_id', 'host_name', 'host_avatar',
            'calculated_position', 'server_timestamp', 'member_count',
            'members', 'recent_messages', 'created_at', 'updated_at',
        ]

    def get_host_name(self, obj):
        if hasattr(obj.host, 'profile') and obj.host.profile.display_name:
            return obj.host.profile.display_name
        return obj.host.username

    def get_host_avatar(self, obj):
        request = self.context.get('request')
        return _user_avatar(obj.host, request)

    def get_server_timestamp(self, obj):
        return time.time()

    def get_member_count(self, obj):
        return obj.members.count()

    def get_members(self, obj):
        request = self.context.get('request')
        members = obj.members.select_related('user', 'user__profile').all()[:20]
        return RoomMemberSerializer(members, many=True, context={'request': request}).data

    def get_recent_messages(self, obj):
        request = self.context.get('request')
        # last 50 messages
        msgs = obj.messages.select_related('user', 'user__profile').order_by('-created_at')[:50]
        return RoomMessageSerializer(reversed(list(msgs)), many=True, context={'request': request}).data


class RoomStateSerializer(serializers.ModelSerializer):
    """Lightweight serializer for fast real-time synchronization pings."""
    current_track = LocalTrackSerializer(read_only=True)
    calculated_position = serializers.FloatField(read_only=True)
    server_timestamp = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'code', 'is_playing', 'position_seconds',
            'calculated_position', 'position_updated_at',
            'server_timestamp', 'current_track', 'member_count',
        ]

    def get_server_timestamp(self, obj):
        return time.time()

    def get_member_count(self, obj):
        return obj.members.count()
