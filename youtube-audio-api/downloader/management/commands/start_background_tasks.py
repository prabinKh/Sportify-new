from django.core.management.base import BaseCommand
from background_task.models import Task
from downloader.views import schedule_recurring_tasks_once

class Command(BaseCommand):
    help = "Safely schedule background tasks for recurring checks and downloads"

    def handle(self, *args, **options):
        self.stdout.write("Scheduling background tasks...")
        schedule_recurring_tasks_once()
        count = Task.objects.count()
        self.stdout.write(self.style.SUCCESS(f"Background tasks initialized. Active tasks in queue: {count}"))
