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


class ChannelListAPIView(generics.ListCreateAPIView):
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
        return MediaFile.objects.filter(
            youtube_channel_id=channel_id
        ).filter(audio_file__isnull=False).exclude(audio_file='')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class MediaFileDetailAPIView(generics.RetrieveAPIView):
    queryset = MediaFile.objects.filter(audio_file__isnull=False).exclude(audio_file='')
    serializer_class = MediaFileSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class AudioFileListAPIView(generics.ListAPIView):
    queryset = MediaFile.objects.filter(audio_file__isnull=False).exclude(audio_file='')
    serializer_class = MediaFileSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


def paginate_queryset_if_requested(view, request, queryset):
    limit_param = request.query_params.get('limit')
    offset_param = request.query_params.get('offset', 0)

    if limit_param is not None:
        try:
            limit = int(limit_param)
            offset = int(offset_param)
            total = queryset.count()
            items_qs = queryset[offset:offset + limit]
            serializer = view.get_serializer(items_qs, many=True)
            has_more = (offset + limit) < total
            return Response({
                'items': serializer.data,
                'total': total,
                'count': total,
                'offset': offset,
                'limit': limit,
                'has_more': has_more,
            })
        except (ValueError, TypeError):
            pass
    return None


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
            .annotate(audio_count=Count('media_files', filter=~Q(media_files__audio_file='') & Q(media_files__audio_file__isnull=False)))
            .filter(audio_count__gt=0)
            .order_by('id')
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        res = paginate_queryset_if_requested(self, request, queryset)
        if res is not None:
            return res
        return super().list(request, *args, **kwargs)

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
            .annotate(audio_count=Count('media_files', filter=~Q(media_files__audio_file='') & Q(media_files__audio_file__isnull=False)))
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
        return (
            MediaFile.objects
            .filter(youtube_channel_id=artist_id)
            .filter(audio_file__isnull=False)
            .exclude(audio_file='')
            .order_by('-downloaded_at')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ── Flat Track APIs ───────────────────────────────────────────────────────────

class LocalTrackListAPIView(generics.ListAPIView):
    """All downloaded audio tracks across all channels."""
    serializer_class = LocalTrackSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            MediaFile.objects
            .filter(audio_file__isnull=False)
            .exclude(audio_file='')
            .select_related('youtube_channel')
            .order_by('-downloaded_at')
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        res = paginate_queryset_if_requested(self, request, queryset)
        if res is not None:
            return res
        return super().list(request, *args, **kwargs)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

AllLocalTracksAPIView = LocalTrackListAPIView


class LocalTrackDetailAPIView(generics.RetrieveAPIView):
    """Single downloaded audio track by ID."""
    serializer_class = LocalTrackSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            MediaFile.objects
            .filter(audio_file__isnull=False)
            .exclude(audio_file='')
            .select_related('youtube_channel')
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
            .filter(audio_file__isnull=False)
            .exclude(audio_file='')
            .select_related('youtube_channel')
            .order_by('-downloaded_at')
        )
        if q:
            qs = qs.filter(
                Q(title__icontains=q) | Q(youtube_channel__name__icontains=q)
            )
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        res = paginate_queryset_if_requested(self, request, queryset)
        if res is not None:
            return res
        return super().list(request, *args, **kwargs)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ── Custom Playlist API Views ──────────────────────────────────────────────────

class PlaylistListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        q = self.request.query_params.get('q', '').strip()
        qs = Playlist.objects.all().order_by('-created_at')

        if user.is_authenticated:
            qs = qs.filter(Q(is_public=True) | Q(user=user))
        else:
            qs = qs.filter(is_public=True)

        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))

        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'You must be signed in to create a playlist.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Playlist name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        description = request.data.get('description', '').strip()
        is_public_raw = request.data.get('is_public', True)
        if isinstance(is_public_raw, str):
            is_public = is_public_raw.lower() not in ('false', '0', 'no')
        else:
            is_public = bool(is_public_raw)

        # Unique name validation for public playlists
        if is_public:
            if Playlist.objects.filter(name__iexact=name, is_public=True).exists():
                return Response(
                    {'error': f"A public playlist named '{name}' already exists. Please choose a unique name for public playlists."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        playlist = Playlist.objects.create(
            name=name,
            description=description,
            is_public=is_public,
            user=request.user
        )

        serializer = self.get_serializer(playlist)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PlaylistDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Playlist.objects.filter(Q(is_public=True) | Q(user=user))
        return Playlist.objects.filter(is_public=True)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def update(self, request, *args, **kwargs):
        playlist = self.get_object()
        if not request.user.is_authenticated or (playlist.user and playlist.user != request.user):
            return Response({'error': 'You do not have permission to edit this playlist.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        playlist = self.get_object()
        if not request.user.is_authenticated or (playlist.user and playlist.user != request.user):
            return Response({'error': 'You do not have permission to delete this playlist.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class PlaylistTrackAddRemoveAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        if not request.user.is_authenticated:
            return Response({'error': 'You must be signed in to modify playlists.'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            playlist = Playlist.objects.get(pk=pk)
        except Playlist.DoesNotExist:
            return Response({'error': 'Playlist not found'}, status=status.HTTP_404_NOT_FOUND)

        if playlist.user and playlist.user != request.user:
            return Response({'error': 'You do not have permission to modify this playlist.'}, status=status.HTTP_403_FORBIDDEN)

        track_id = request.data.get('track_id')
        try:
            track = MediaFile.objects.filter(audio_file__isnull=False).exclude(audio_file='').get(pk=track_id)
        except MediaFile.DoesNotExist:
            return Response({'error': 'Track not found or has no audio'}, status=status.HTTP_404_NOT_FOUND)

        playlist.tracks.add(track)
        serializer = PlaylistSerializer(playlist, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        if not request.user.is_authenticated:
            return Response({'error': 'You must be signed in to modify playlists.'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            playlist = Playlist.objects.get(pk=pk)
        except Playlist.DoesNotExist:
            return Response({'error': 'Playlist not found'}, status=status.HTTP_404_NOT_FOUND)

        if playlist.user and playlist.user != request.user:
            return Response({'error': 'You do not have permission to modify this playlist.'}, status=status.HTTP_403_FORBIDDEN)

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
    serializer_class = FavoriteTrackSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return FavoriteTrack.objects.none()
        return (
            FavoriteTrack.objects
            .filter(user=self.request.user)
            .filter(media_file__audio_file__isnull=False)
            .exclude(media_file__audio_file='')
            .select_related('media_file', 'media_file__youtube_channel')
            .order_by('-created_at')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class FavoriteTrackToggleAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'You must be signed in to save favorite tracks.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        track_id = request.data.get('track_id')
        try:
            track = MediaFile.objects.filter(audio_file__isnull=False).exclude(audio_file='').get(pk=track_id)
        except MediaFile.DoesNotExist:
            return Response({'error': 'Track not found or has no audio'}, status=status.HTTP_404_NOT_FOUND)

        fav = FavoriteTrack.objects.filter(user=request.user, media_file=track).first()
        if fav:
            fav.delete()
            return Response({'status': 'removed', 'track_id': track.id, 'saved': False})
        else:
            fav = FavoriteTrack.objects.create(user=request.user, media_file=track)
            serializer = FavoriteTrackSerializer(fav, context={'request': request})
            return Response({'status': 'added', 'favorite': serializer.data, 'saved': True})


# ── Listening History API Views ────────────────────────────────────────────────

class ListeningHistoryAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = (
            ListeningHistory.objects
            .filter(media_file__audio_file__isnull=False)
            .exclude(media_file__audio_file='')
            .select_related('media_file', 'media_file__youtube_channel')
            .order_by('-played_at')
        )
        if request.user.is_authenticated:
            qs = qs.filter(user=request.user)
        history = qs[:50]
        serializer = ListeningHistorySerializer(history, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        track_id = request.data.get('track_id')
        try:
            track = MediaFile.objects.get(pk=track_id)
        except MediaFile.DoesNotExist:
            return Response({'error': 'Track not found'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user if request.user.is_authenticated else None
        item = ListeningHistory.objects.create(media_file=track, user=user)
        serializer = ListeningHistorySerializer(item, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ── Followed Artists API Views ───────────────────────────────────────────────

class FollowedArtistListAPIView(generics.ListAPIView):
    serializer_class = FollowedArtistSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return FollowedArtist.objects.none()
        return (
            FollowedArtist.objects
            .filter(user=self.request.user)
            .select_related('channel')
            .order_by('-followed_at')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class FollowArtistToggleAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'You must be signed in to follow artists.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        artist_id = request.data.get('artist_id') or request.data.get('id')
        if not artist_id:
            return Response({'error': 'artist_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            channel = YouTubeChannel.objects.get(pk=artist_id)
        except (YouTubeChannel.DoesNotExist, ValueError):
            return Response({'error': 'Artist not found'}, status=status.HTTP_404_NOT_FOUND)

        follow_obj = FollowedArtist.objects.filter(user=request.user, channel=channel).first()
        if follow_obj:
            follow_obj.delete()
            return Response({'following': False, 'artist_id': channel.id, 'status': 'unfollowed'})
        else:
            FollowedArtist.objects.create(user=request.user, channel=channel)
            return Response({'following': True, 'artist_id': channel.id, 'status': 'followed'})


class CheckFollowedArtistAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            return Response([])
        ids = [i.strip() for i in ids_param.split(',') if i.strip()]

        if not request.user.is_authenticated:
            return Response([False] * len(ids))

        followed_ids = set(
            FollowedArtist.objects.filter(user=request.user, channel_id__in=ids).values_list('channel_id', flat=True)
        )
        result = [int(i) in followed_ids if i.isdigit() else False for i in ids]
        return Response(result)


class ArtistPlaylistsAPIView(generics.ListAPIView):
    """Playlists belonging to a specific artist."""
    serializer_class = PlaylistSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        artist_id = self.kwargs.get('artist_id')
        user = self.request.user
        qs = Playlist.objects.filter(
            Q(channel_id=artist_id) | Q(tracks__youtube_channel_id=artist_id)
        ).distinct().order_by('-created_at')

        if user.is_authenticated:
            return qs.filter(Q(is_public=True) | Q(user=user))
        return qs.filter(is_public=True)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class SyncChannelAPIView(APIView):
    """Trigger background re-sync of a channel (/videos, home, /playlists)."""
    permission_classes = [AllowAny]

    def post(self, request, channel_id):
        try:
            channel = YouTubeChannel.objects.get(pk=channel_id)
        except YouTubeChannel.DoesNotExist:
            return Response({'error': 'Channel not found'}, status=status.HTTP_404_NOT_FOUND)

        fetch_and_save_media_urls(channel)
        schedule_recurring_tasks_once()
        return Response({'status': 'ok', 'message': f'Synced channel {channel.name}'})


class MediaFileStemAPIView(APIView):
    """Serve stem processed audio URLs (e.g. vocal_only, beat_only, vocal_mute)."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            media = MediaFile.objects.get(pk=pk)
        except MediaFile.DoesNotExist:
            return Response({'error': 'Media not found'}, status=status.HTTP_404_NOT_FOUND)

        from .audio_dsp import process_audio_stem
        mode = request.query_params.get('mode', 'vocal_only')
        stem_url = process_audio_stem(media, mode)
        return Response({'url': stem_url, 'mode': mode, 'track_id': pk})