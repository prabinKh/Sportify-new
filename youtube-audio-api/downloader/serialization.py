import re
from rest_framework import serializers
from .models import MediaFile, YouTubeChannel, Playlist, FavoriteTrack, ListeningHistory, FollowedArtist


def _absolute(request, url):
    """Return an absolute URL for a file field value, or None."""
    if not url:
        return None
    if hasattr(url, 'url'):
        url = url.url
    if url.startswith('http'):
        return url
    if request:
        return request.build_absolute_uri(url)
    return url


def _extract_video_id(media_url):
    """Pull the 11-character YouTube video ID from any known URL format."""
    match = re.search(r'(?:/v/|v=|embed/|shorts/)([A-Za-z0-9_-]{11})', media_url or '')
    return match.group(1) if match else ''


class YouTubeChannelSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = YouTubeChannel
        fields = ['id', 'name', 'channel_id', 'created_at', 'profile_picture']

    def validate_channel_id(self, value):
        from .forms import clean_channel_id_value
        return clean_channel_id_value(value)

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.profile_picture:
            return _absolute(request, obj.profile_picture)
        return None


class MediaFileSerializer(serializers.ModelSerializer):
    youtube_channel = YouTubeChannelSerializer(read_only=True)
    is_downloadable = serializers.BooleanField(read_only=True)
    audio_file = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = MediaFile
        fields = [
            'id', 'youtube_channel', 'media_url', 'title', 'video_id',
            'created_at', 'audio_file', 'thumbnail', 'downloaded_at',
            'duration_seconds', 'is_downloadable',
        ]
        read_only_fields = [
            'audio_file', 'thumbnail', 'downloaded_at',
            'duration_seconds', 'is_downloadable', 'title', 'video_id',
        ]

    def get_audio_file(self, obj):
        request = self.context.get('request')
        if obj.audio_file:
            return _absolute(request, obj.audio_file)
        return None

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if obj.thumbnail:
            return _absolute(request, obj.thumbnail)
        # Fallback: use YouTube's CDN thumbnail via video_id
        vid = obj.video_id or _extract_video_id(obj.media_url)
        if vid:
            return f'https://i.ytimg.com/vi/{vid}/mqdefault.jpg'
        return None


class ArtistAudioSerializer(serializers.ModelSerializer):
    audio_file = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    title = serializers.CharField()
    video_id = serializers.CharField()

    class Meta:
        model = MediaFile
        fields = [
            'id', 'media_url', 'audio_file', 'thumbnail',
            'duration_seconds', 'downloaded_at', 'title', 'video_id',
        ]

    def get_audio_file(self, obj):
        request = self.context.get('request')
        if obj.audio_file:
            return _absolute(request, obj.audio_file)
        return None

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if obj.thumbnail:
            return _absolute(request, obj.thumbnail)
        vid = obj.video_id or _extract_video_id(obj.media_url)
        if vid:
            return f'https://i.ytimg.com/vi/{vid}/mqdefault.jpg'
        return None


class ArtistSerializer(serializers.ModelSerializer):
    audio_count = serializers.IntegerField(read_only=True)
    audio_files = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    playlists = serializers.SerializerMethodField()

    class Meta:
        model = YouTubeChannel
        fields = ['id', 'name', 'channel_id', 'profile_picture', 'audio_count', 'audio_files', 'playlists']

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.profile_picture:
            return _absolute(request, obj.profile_picture)
        return None

    def get_audio_files(self, obj):
        audios = MediaFile.objects.filter(youtube_channel=obj).filter(audio_file__isnull=False).exclude(audio_file='')
        return ArtistAudioSerializer(audios, many=True, context=self.context).data

    def get_playlists(self, obj):
        pls = Playlist.objects.filter(channel=obj).order_by('-created_at')
        return PlaylistSerializer(pls, many=True, context=self.context).data


class LocalTrackSerializer(serializers.ModelSerializer):
    """Flat serializer used for the /api/tracks/ and /api/tracks/search/ endpoints."""
    audio_file = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    artist_id = serializers.IntegerField(source='youtube_channel.id', read_only=True)
    artist_name = serializers.CharField(source='youtube_channel.name', read_only=True)
    artist_picture = serializers.SerializerMethodField()

    class Meta:
        model = MediaFile
        fields = [
            'id', 'media_url', 'title', 'video_id',
            'audio_file', 'thumbnail', 'duration_seconds',
            'downloaded_at', 'artist_id', 'artist_name', 'artist_picture',
        ]

    def get_audio_file(self, obj):
        request = self.context.get('request')
        if obj.audio_file:
            return _absolute(request, obj.audio_file)
        return None

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if obj.thumbnail:
            return _absolute(request, obj.thumbnail)
        vid = obj.video_id or _extract_video_id(obj.media_url)
        if vid:
            return f'https://i.ytimg.com/vi/{vid}/mqdefault.jpg'
        return None

    def get_artist_picture(self, obj):
        request = self.context.get('request')
        if obj.youtube_channel.profile_picture:
            return _absolute(request, obj.youtube_channel.profile_picture)
        return None


class PlaylistSerializer(serializers.ModelSerializer):
    tracks_count = serializers.SerializerMethodField()
    tracks = serializers.SerializerMethodField()
    channel_id = serializers.IntegerField(source='channel.id', read_only=True, allow_null=True)
    channel_name = serializers.CharField(source='channel.name', read_only=True, allow_null=True)

    class Meta:
        model = Playlist
        fields = ['id', 'name', 'description', 'playlist_id', 'channel_id', 'channel_name', 'created_at', 'tracks_count', 'tracks']

    def get_tracks(self, obj):
        audios = obj.tracks.filter(audio_file__isnull=False).exclude(audio_file='')
        return LocalTrackSerializer(audios, many=True, context=self.context).data

    def get_tracks_count(self, obj):
        return obj.tracks.filter(audio_file__isnull=False).exclude(audio_file='').count()


class FavoriteTrackSerializer(serializers.ModelSerializer):
    media_file = LocalTrackSerializer(read_only=True)

    class Meta:
        model = FavoriteTrack
        fields = ['id', 'media_file', 'created_at']


class ListeningHistorySerializer(serializers.ModelSerializer):
    media_file = LocalTrackSerializer(read_only=True)

    class Meta:
        model = ListeningHistory
        fields = ['id', 'media_file', 'played_at']


class FollowedArtistSerializer(serializers.ModelSerializer):
    channel = ArtistSerializer(read_only=True)

    class Meta:
        model = FollowedArtist
        fields = ['id', 'channel', 'followed_at']