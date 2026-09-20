"""
Management command: purge_invalid_duration

Deletes all MediaFile records whose duration_seconds is known
and falls outside the allowed window [120s, 600s] (2–10 minutes).

Usage:
    python manage.py purge_invalid_duration
    python manage.py purge_invalid_duration --dry-run
"""

import os
from django.core.management.base import BaseCommand
from downloader.models import MediaFile
from downloader.utils import MIN_DURATION_SECONDS, MAX_DURATION_SECONDS


class Command(BaseCommand):
    help = (
        f"Delete MediaFile records with duration outside "
        f"[{MIN_DURATION_SECONDS}s, {MAX_DURATION_SECONDS}s] "
        f"({MIN_DURATION_SECONDS // 60}–{MAX_DURATION_SECONDS // 60} min)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List records that would be deleted without actually deleting them.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Records with known duration that are too short
        too_short = MediaFile.objects.filter(
            duration_seconds__isnull=False,
            duration_seconds__lt=MIN_DURATION_SECONDS,
        )

        # Records with known duration that are too long
        too_long = MediaFile.objects.filter(
            duration_seconds__isnull=False,
            duration_seconds__gt=MAX_DURATION_SECONDS,
        )

        invalid_qs = too_short | too_long

        total = invalid_qs.count()
        self.stdout.write(
            self.style.WARNING(
                f"Found {total} MediaFile record(s) outside the "
                f"{MIN_DURATION_SECONDS}–{MAX_DURATION_SECONDS}s range."
            )
        )

        if total == 0:
            self.stdout.write(self.style.SUCCESS("Nothing to purge."))
            return

        for media in invalid_qs.select_related("youtube_channel"):
            label = (
                f"  ID={media.id} | {media.duration_seconds}s | "
                f"{media.youtube_channel.name if media.youtube_channel else '?'} | "
                f"{media.title or media.media_url}"
            )
            self.stdout.write(label)

            if not dry_run:
                # Remove audio file from disk if present
                if media.audio_file:
                    try:
                        path = media.audio_file.path
                        if os.path.exists(path):
                            os.remove(path)
                    except Exception as e:
                        self.stderr.write(f"    [WARN] Could not delete audio file: {e}")

                # Remove thumbnail from disk if present
                if media.thumbnail:
                    try:
                        path = media.thumbnail.path
                        if os.path.exists(path):
                            os.remove(path)
                    except Exception as e:
                        self.stderr.write(f"    [WARN] Could not delete thumbnail: {e}")

                media.delete()

        if dry_run:
            self.stdout.write(
                self.style.NOTICE("Dry-run complete. No records were deleted.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Purged {total} record(s) successfully.")
            )
