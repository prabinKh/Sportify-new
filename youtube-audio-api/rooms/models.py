import random
import string
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


def generate_room_code(length=6):
    chars = string.ascii_uppercase + string.digits
    # Exclude ambiguous characters (0, O, 1, I)
    chars = chars.replace('0', '').replace('O', '').replace('1', '').replace('I', '')
    return ''.join(random.choices(chars, k=length))


class Room(models.Model):
    code = models.CharField(max_length=10, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_rooms')
    current_track = models.ForeignKey(
        'downloader.MediaFile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_in_rooms'
    )
    is_playing = models.BooleanField(default=False)
    position_seconds = models.FloatField(default=0.0)
    position_updated_at = models.DateTimeField(default=timezone.now)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.code:
            code = generate_room_code()
            while Room.objects.filter(code=code).exists():
                code = generate_room_code()
            self.code = code
        super().save(*args, **kwargs)

    @property
    def calculated_position(self):
        """Calculates live synchronized playback position based on server time."""
        if not self.is_playing:
            return max(0.0, self.position_seconds)
        now = timezone.now()
        elapsed = (now - self.position_updated_at).total_seconds()
        return max(0.0, self.position_seconds + elapsed)

    def __str__(self):
        return f"{self.name} [{self.code}] (Host: {self.host.username})"


class RoomMember(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='room_memberships')
    is_host = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('room', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.room.code} ({'Host' if self.is_host else 'Listener'})"


class RoomMessage(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='room_messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.room.code}] {self.user.username}: {self.text[:30]}"
