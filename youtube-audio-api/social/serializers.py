from rest_framework import serializers
from django.contrib.auth.models import User
from .models import FriendRequest, DirectMessage


def _avatar(user):
    try:
        return user.profile.avatar_url
    except Exception:
        return 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'


def _display(user):
    try:
        dn = user.profile.display_name
        if dn:
            return dn
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
        return _avatar(obj)


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
