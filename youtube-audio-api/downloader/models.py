from django.db import models

class YouTubeChannel(models.Model):
    name = models.CharField(max_length=255)
    channel_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    feed_hash = models.CharField(max_length=64, blank=True, default='')
    profile_picture = models.ImageField(upload_to='channel_profiles/', null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.channel_id})"

class MediaFile(models.Model):
    youtube_channel = models.ForeignKey(YouTubeChannel, on_delete=models.CASCADE, related_name='media_files')
    media_url = models.URLField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    audio_file = models.FileField(upload_to='audio/', null=True, blank=True)
    thumbnail = models.ImageField(upload_to='thumbnails/', null=True, blank=True)
    downloaded_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.media_url}"

    @property
    def is_downloadable(self):
        """Only audio between 2 and 10 minutes gets downloaded."""
        if self.duration_seconds is None:
            return False
        return 120 <= self.duration_seconds <= 600