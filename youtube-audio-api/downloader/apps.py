import sys
from django.apps import AppConfig


class DownloaderConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'downloader'

    def ready(self):
        if 'runserver' in sys.argv:
            import threading
            def auto_start():
                try:
                    from .utils import process_all_pending_audio
                    process_all_pending_audio()
                except Exception as e:
                    print(f"[INIT] Auto pending audio queue error: {e}")

            threading.Thread(target=auto_start, daemon=True).start()

