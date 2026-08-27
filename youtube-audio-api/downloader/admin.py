from django.contrib import admin
from .models import YouTubeChannel, MediaFile

class MediaFileInline(admin.TabularInline):
    model = MediaFile
    extra = 0
    fields = ('media_url', 'audio_file', 'downloaded_at')
    readonly_fields = ('downloaded_at',)

@admin.register(YouTubeChannel)
class YouTubeChannelAdmin(admin.ModelAdmin):
    list_display = ('name', 'channel_id', 'created_at')
    search_fields = ('name', 'channel_id')
    inlines = [MediaFileInline]

@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display = ('media_url', 'youtube_channel', 'has_audio', 'created_at')
    list_filter = ('youtube_channel', 'downloaded_at')
    
    def has_audio(self, obj):
        return bool(obj.audio_file)
    has_audio.boolean = True