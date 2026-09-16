from django.contrib import admin
from .models import YouTubeChannel, MediaFile, DownloaderSetting

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


@admin.register(DownloaderSetting)
class DownloaderSettingAdmin(admin.ModelAdmin):
    """Upload/paste YouTube cookies to bypass datacenter IP bot-detection."""
    list_display = ('__str__', 'updated_at')
    fieldsets = (
        ('Cookie File (Upload)', {
            'description': (
                '📌 Upload a Netscape-formatted cookies.txt exported from your browser. '
                'Use the "Get cookies.txt LOCALLY" extension in Chrome/Firefox while logged into YouTube.'
            ),
            'fields': ('cookies_file',),
        }),
        ('Cookie Text (Paste)', {
            'description': (
                '📌 Or paste the full contents of your cookies.txt file below. '
                'Leave blank if you uploaded a file above.'
            ),
            'fields': ('cookies_text',),
        }),
    )

    def has_add_permission(self, request):
        # Allow adding only if no settings exist yet (singleton)
        return not DownloaderSetting.objects.exists()