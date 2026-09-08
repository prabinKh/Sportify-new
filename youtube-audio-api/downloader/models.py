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
    title = models.CharField(max_length=500, blank=True, default='')
    video_id = models.CharField(max_length=11, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    audio_file = models.FileField(upload_to='audio/', null=True, blank=True)
    thumbnail = models.ImageField(upload_to='thumbnails/', null=True, blank=True)
    downloaded_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.title or self.media_url


    @property
    def is_downloadable(self):
        """Only audio between 2 and 10 minutes gets downloaded."""
        if self.duration_seconds is None:
            return False
        return 120 <= self.duration_seconds <= 600


class Playlist(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    tracks = models.ManyToManyField(MediaFile, related_name='playlists', blank=True)

    def __str__(self):
        return self.name


class FavoriteTrack(models.Model):
    media_file = models.OneToOneField(MediaFile, on_delete=models.CASCADE, related_name='favorite')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Favorite: {self.media_file}"


class ListeningHistory(models.Model):
    media_file = models.ForeignKey(MediaFile, on_delete=models.CASCADE, related_name='history_entries')
    played_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-played_at']

    def __str__(self):
        return f"History: {self.media_file.title or self.media_file.id} at {self.played_at}"


class FollowedArtist(models.Model):
    channel = models.OneToOneField(YouTubeChannel, on_delete=models.CASCADE, related_name='follow_entry')
    followed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-followed_at']

    def __str__(self):
        return f"Followed: {self.channel.name}"



from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=YouTubeChannel)
def handle_channel_saved(sender, instance, created, **kwargs):
    if created:
        from .utils import fetch_and_save_media_urls
        from .views import schedule_recurring_tasks_once
        fetch_and_save_media_urls(instance)
        schedule_recurring_tasks_once()


@receiver(post_save, sender=MediaFile)
def handle_media_file_saved(sender, instance, created, **kwargs):
    if created and not instance.audio_file:
        from .utils import queue_media_download
        queue_media_download(instance.id)
