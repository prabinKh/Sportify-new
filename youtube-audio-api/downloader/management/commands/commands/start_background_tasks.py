# downloader/management/commands/start_background_tasks.py
from django.core.management.base import BaseCommand
from downloader.utils import check_and_update_media_urls, download_audio

class Command(BaseCommand):
    help = "Start the background tasks for checking URLs and downloading audio"

    def handle(self, *args, **options):
        self.stdout.write("Starting background tasks...")
        
        # Schedule the tasks
        check_and_update_media_urls(repeat=60)  # Run every minute
        download_audio(repeat=300)  # Run every 5 minutes
        
        self.stdout.write("Background tasks have been scheduled.")