import os
from django.conf import settings

def process_audio_stem(media_file_instance, mode: str) -> str:
    """
    Returns the track audio URL cleanly without heavy AI processing.
    """
    if not media_file_instance or not media_file_instance.audio_file:
        return ''

    return media_file_instance.audio_file.url
