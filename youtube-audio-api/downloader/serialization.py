from rest_framework import serializers
from .models import MediaFile, YouTubeChannel


class YouTubeChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = YouTubeChannel
        fields = ['id', 'name', 'channel_id', 'created_at', 'profile_picture']


class MediaFileSerializer(serializers.ModelSerializer):
    youtube_channel = YouTubeChannelSerializer(read_only=True)
    is_downloadable = serializers.BooleanField(read_only=True)

    class Meta:
        model = MediaFile
        fields = ['id', 'youtube_channel', 'media_url', 'created_at', 'audio_file',
                  'thumbnail', 'downloaded_at', 'duration_seconds', 'is_downloadable']
        read_only_fields = ['audio_file', 'thumbnail', 'downloaded_at', 'duration_seconds', 'is_downloadable']


class ArtistSerializer(serializers.ModelSerializer):
    audio_count = serializers.IntegerField(read_only=True)
    audio_files = serializers.SerializerMethodField()

    class Meta:
        model = YouTubeChannel
        fields = ['id', 'name', 'channel_id', 'profile_picture', 'audio_count', 'audio_files']

    def get_audio_files(self, obj):
        audios = MediaFile.objects.filter(youtube_channel=obj).exclude(audio_file='')
        return ArtistAudioSerializer(audios, many=True, context=self.context).data


class ArtistAudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaFile
        fields = ['id', 'media_url', 'audio_file', 'thumbnail', 'duration_seconds', 'downloaded_at']