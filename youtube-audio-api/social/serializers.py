from rest_framework import serializers
from django.contrib.auth.models import User
from .models import FriendRequest, DirectMessage


def _avatar(user, request=None):
    try:
        profile = getattr(user, 'profile', None)
        if profile and profile.avatar_url:
            url = profile.avatar_url
            if url.startswith('/media/'):
                if request:
                    return request.build_absolute_uri(url)
                return f"http://127.0.0.1:8000{url}"
            return url
    except Exception:
        pass
    return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'


def _display(user):
    try:
        if hasattr(user, 'profile') and user.profile.display_name:
            return user.profile.display_name
    except Exception:
        pass
    return user.get_full_name() or user.username


class UserSummarySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'avatar']

    def get_display_name(self, obj):
        return _display(obj)

    def get_avatar(self, obj):
        request = self.context.get('request')
        return _avatar(obj, request)


class FriendRequestSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)
    receiver = UserSummarySerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = ['id', 'sender', 'receiver', 'status', 'created_at', 'updated_at']


class DirectMessageSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)
    receiver = UserSummarySerializer(read_only=True)

    class Meta:
        model = DirectMessage
        fields = ['id', 'sender', 'receiver', 'text', 'read', 'created_at']
