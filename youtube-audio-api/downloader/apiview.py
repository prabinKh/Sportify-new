from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Q
from .models import MediaFile, YouTubeChannel
from .serialization import (
    MediaFileSerializer, YouTubeChannelSerializer,
    ArtistSerializer, ArtistAudioSerializer,
)
from .utils import fetch_and_save_media_urls
from .views import schedule_recurring_tasks_once


class YouTubeChannelCreateAPIView(generics.CreateAPIView):
    queryset = YouTubeChannel.objects.all()
    serializer_class = YouTubeChannelSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        channel = serializer.save()
        fetch_and_save_media_urls(channel)
        schedule_recurring_tasks_once()


class ChannelListAPIView(generics.ListAPIView):
    queryset = YouTubeChannel.objects.all()
    serializer_class = YouTubeChannelSerializer
    permission_classes = [IsAuthenticated]

class MediaFileListAPIView(generics.ListAPIView):
    serializer_class = MediaFileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        channel_id = self.kwargs.get('channel_id')
        return MediaFile.objects.filter(youtube_channel_id=channel_id)

class MediaFileDetailAPIView(generics.RetrieveAPIView):
    queryset = MediaFile.objects.all()
    serializer_class = MediaFileSerializer
    permission_classes = [IsAuthenticated]


class AudioFileListAPIView(generics.ListAPIView):
    queryset = MediaFile.objects.exclude(audio_file='')
    serializer_class = MediaFileSerializer
    permission_classes = [IsAuthenticated]


# --- Artist APIs: only channels that have at least one downloaded audio ---

class ArtistListAPIView(generics.ListAPIView):
    """List artists (channels) that have audio. Each artist includes
    its profile picture and all audio files."""
    serializer_class = ArtistSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            YouTubeChannel.objects
            .annotate(audio_count=Count('media_files', filter=~Q(media_files__audio_file='')))
            .filter(audio_count__gt=0)
            .order_by('id')
        )


class ArtistDetailAPIView(generics.RetrieveAPIView):
    """Single artist with all its audio files."""
    serializer_class = ArtistSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            YouTubeChannel.objects
            .annotate(audio_count=Count('media_files', filter=~Q(media_files__audio_file='')))
            .filter(audio_count__gt=0)
        )


class ArtistAudiosAPIView(generics.ListAPIView):
    """Audio-only list for a specific artist."""
    serializer_class = ArtistAudioSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        artist_id = self.kwargs.get('artist_id')
        return MediaFile.objects.filter(youtube_channel_id=artist_id).exclude(audio_file='')