from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Q
from .models import MediaFile, YouTubeChannel, Playlist, FavoriteTrack, ListeningHistory, FollowedArtist
from .serialization import (
    MediaFileSerializer, YouTubeChannelSerializer,
    ArtistSerializer, ArtistAudioSerializer,
    LocalTrackSerializer, PlaylistSerializer,
    FavoriteTrackSerializer, ListeningHistorySerializer,
    FollowedArtistSerializer,
)
from .utils import fetch_and_save_media_urls
from .views import schedule_recurring_tasks_once


class YouTubeChannelCreateAPIView(generics.CreateAPIView):
    queryset = YouTubeChannel.objects.all()
    serializer_class = YouTubeChannelSerializer
    permission_classes = [AllowAny]


class ChannelListAPIView(generics.ListAPIView):
    queryset = YouTubeChannel.objects.all()
    serializer_class = YouTubeChannelSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class MediaFileListAPIView(generics.ListAPIView):
    serializer_class = MediaFileSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        channel_id = self.kwargs.get('channel_id')
        return MediaFile.objects.filter(youtube_channel_id=channel_id)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class MediaFileDetailAPIView(generics.RetrieveAPIView):
    queryset = MediaFile.objects.all()
    serializer_class = MediaFileSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class AudioFileListAPIView(generics.ListAPIView):
    queryset = MediaFile.objects.exclude(audio_file='')
    serializer_class = MediaFileSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ── Artist APIs: only channels that have at least one downloaded audio ─────────

class ArtistListAPIView(generics.ListAPIView):
    """List artists (channels) that have audio. Each artist includes
    its profile picture and all audio files."""
    serializer_class = ArtistSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            YouTubeChannel.objects
            .annotate(audio_count=Count('media_files', filter=~Q(media_files__audio_file='')))
            .filter(audio_count__gt=0)
            .order_by('id')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


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

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class ArtistAudiosAPIView(generics.ListAPIView):
    """Audio-only list for a specific artist."""
    serializer_class = ArtistAudioSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        artist_id = self.kwargs.get('artist_id')
        return MediaFile.objects.filter(
            youtube_channel_id=artist_id
        ).exclude(audio_file='').order_by('-downloaded_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ── Flat track endpoints ───────────────────────────────────────────────────────

class AllLocalTracksAPIView(generics.ListAPIView):
    """Return all downloaded audio tracks across all artists, newest first."""
    serializer_class = LocalTrackSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            MediaFile.objects
            .exclude(audio_file='')
            .select_related('youtube_channel')
            .order_by('-downloaded_at')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class SearchLocalTracksAPIView(generics.ListAPIView):
    """Search downloaded tracks by ?q= query (matches title and artist name)."""
    serializer_class = LocalTrackSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()
        qs = (
            MediaFile.objects
            .exclude(audio_file='')
            .select_related('youtube_channel')
            .order_by('-downloaded_at')
        )
        if q:
            qs = qs.filter(
                Q(title__icontains=q) | Q(youtube_channel__name__icontains=q)
            )
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ── Custom Playlist API Views ──────────────────────────────────────────────────

class PlaylistListCreateAPIView(generics.ListCreateAPIView):
    queryset = Playlist.objects.all().order_by('-created_at')
    serializer_class = PlaylistSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class PlaylistDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Playlist.objects.all()
    serializer_class = PlaylistSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class PlaylistTrackAddRemoveAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            playlist = Playlist.objects.get(pk=pk)
        except Playlist.DoesNotExist:
            return Response({'error': 'Playlist not found'}, status=status.HTTP_404_NOT_FOUND)

        track_id = request.data.get('track_id')
        try:
            track = MediaFile.objects.get(pk=track_id)
        except MediaFile.DoesNotExist:
            return Response({'error': 'Track not found'}, status=status.HTTP_404_NOT_FOUND)

        playlist.tracks.add(track)
        serializer = PlaylistSerializer(playlist, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            playlist = Playlist.objects.get(pk=pk)
        except Playlist.DoesNotExist:
            return Response({'error': 'Playlist not found'}, status=status.HTTP_404_NOT_FOUND)

        track_id = request.data.get('track_id') or request.query_params.get('track_id')
        try:
            track = MediaFile.objects.get(pk=track_id)
        except MediaFile.DoesNotExist:
            return Response({'error': 'Track not found'}, status=status.HTTP_404_NOT_FOUND)

        playlist.tracks.remove(track)
        serializer = PlaylistSerializer(playlist, context={'request': request})
        return Response(serializer.data)


# ── Favorites API Views ────────────────────────────────────────────────────────

class FavoriteTrackListAPIView(generics.ListAPIView):
    queryset = FavoriteTrack.objects.select_related('media_file', 'media_file__youtube_channel').order_by('-created_at')
    serializer_class = FavoriteTrackSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class FavoriteTrackToggleAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        track_id = request.data.get('track_id')
        try:
            track = MediaFile.objects.get(pk=track_id)
        except MediaFile.DoesNotExist:
            return Response({'error': 'Track not found'}, status=status.HTTP_404_NOT_FOUND)

        fav, created = FavoriteTrack.objects.get_or_create(media_file=track)
        if not created:
            fav.delete()
            return Response({'status': 'removed', 'track_id': track.id})
        else:
            serializer = FavoriteTrackSerializer(fav, context={'request': request})
            return Response({'status': 'added', 'favorite': serializer.data})


# ── Listening History API Views ────────────────────────────────────────────────

class ListeningHistoryAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        history = ListeningHistory.objects.select_related('media_file', 'media_file__youtube_channel').order_by('-played_at')[:50]
        serializer = ListeningHistorySerializer(history, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        track_id = request.data.get('track_id')
        try:
            track = MediaFile.objects.get(pk=track_id)
        except MediaFile.DoesNotExist:
            return Response({'error': 'Track not found'}, status=status.HTTP_404_NOT_FOUND)

        item = ListeningHistory.objects.create(media_file=track)
        serializer = ListeningHistorySerializer(item, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ── Followed Artists API Views ───────────────────────────────────────────────

class FollowedArtistListAPIView(generics.ListAPIView):
    queryset = FollowedArtist.objects.select_related('channel').all()
    serializer_class = FollowedArtistSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class FollowArtistToggleAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        artist_id = request.data.get('artist_id') or request.data.get('id')
        if not artist_id:
            return Response({'error': 'artist_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            channel = YouTubeChannel.objects.get(pk=artist_id)
        except (YouTubeChannel.DoesNotExist, ValueError):
            return Response({'error': 'Artist not found'}, status=status.HTTP_404_NOT_FOUND)

        follow_obj, created = FollowedArtist.objects.get_or_create(channel=channel)
        if not created:
            follow_obj.delete()
            return Response({'following': False, 'artist_id': channel.id, 'status': 'unfollowed'})
        else:
            return Response({'following': True, 'artist_id': channel.id, 'status': 'followed'})


class CheckFollowedArtistAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            return Response([])
        ids = [i.strip() for i in ids_param.split(',') if i.strip()]
        followed_ids = set(
            FollowedArtist.objects.filter(channel_id__in=ids).values_list('channel_id', flat=True)
        )
        result = [int(i) in followed_ids if i.isdigit() else False for i in ids]
        return Response(result)