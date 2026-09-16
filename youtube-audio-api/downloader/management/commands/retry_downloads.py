from django.core.management.base import BaseCommand
from downloader.models import MediaFile
from downloader.utils import _process_media

class Command(BaseCommand):
    help = "Download audio for all MediaFiles that are missing audio"

    def handle(self, *args, **options):
        from django.db.models import Q
        pending = MediaFile.objects.filter(
            Q(audio_file='') | Q(audio_file__isnull=True) | Q(thumbnail='') | Q(thumbnail__isnull=True)
        ).order_by('id')
        total = pending.count()
        self.stdout.write(f"Found {total} media files without audio or thumbnail.")
        for i, media in enumerate(pending, start=1):
            self.stdout.write(f"[{i}/{total}] Processing ID {media.id}: {media.media_url}")
            try:
                _process_media(media)
                media.refresh_from_db()
                if media.audio_file:
                    self.stdout.write(self.style.SUCCESS(f"  -> Downloaded: {media.title or media.media_url}"))
                else:
                    self.stdout.write(self.style.WARNING(f"  -> Processed without audio (duration={media.duration_seconds}s)"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  -> Error: {e}"))
