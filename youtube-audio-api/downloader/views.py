from django.shortcuts import render, redirect
from django.contrib.auth import logout  
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from background_task.models import Task
from .models import YouTubeChannel, MediaFile
from .forms import YouTubeChannelForm
from .utils import fetch_and_save_media_urls, check_and_update_media_urls, download_audio


def schedule_recurring_tasks_once():
    """Schedule the recurring background tasks only once, no matter how
    many channels are added. Prevents duplicate concurrent downloads."""
    if not Task.objects.filter(task_name='downloader.utils.check_and_update_media_urls', repeat=60, failed_at__isnull=True).exists():
        check_and_update_media_urls(repeat=60)  # Check for new uploads every minute
    if not Task.objects.filter(task_name='downloader.utils.download_audio', repeat=3600, failed_at__isnull=True).exists():
        download_audio(repeat=3600)  # Hourly safety net for missed items

def custom_logout_view(request):
    logout(request)  
    messages.success(request, "You have been successfully logged out.")
    return redirect('login')
@login_required
def channel_list(request):
    channels = YouTubeChannel.objects.all()
    return render(request, 'downloader/channel_list.html', {'channels': channels})

@login_required
def add_channel(request):
    if request.method == 'POST':
        form = YouTubeChannelForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('channel_list') 
    else:
        form = YouTubeChannelForm()
    return render(request, 'downloader/add_channel.html', {'form': form})


@login_required
def media_list(request, channel_id):
    channel = YouTubeChannel.objects.get(id=channel_id)
    media_files = channel.media_files.filter(audio_file__isnull=False).exclude(audio_file='')
    return render(request, 'downloader/media_list.html', {
        'channel': channel,
        'media_files': media_files
    })

@login_required
def audio_list(request):
    audio_files = MediaFile.objects.exclude(audio_file='').order_by('-downloaded_at')
    return render(request, 'downloader/audio_list.html', {
        'audio_files': audio_files
    })