import os
import re
import sys
import glob
import json
import hashlib
import shutil
import tempfile
import subprocess
import xml.etree.ElementTree as ET

import requests
from background_task import background
from django.conf import settings
from django.core.files import File
from django.utils import timezone
from django.utils.text import slugify

from .models import YouTubeChannel, MediaFile

MIN_DURATION_SECONDS = 2 * 60   # skip audio shorter than 2 minutes
MAX_DURATION_SECONDS = 10 * 60  # skip audio longer than 10 minutes

RSS_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "media": "http://search.yahoo.com/mrss/",
    "yt": "http://www.youtube.com/xml/schemas/2015",
}


def get_ytdlp_command():
    """Build a yt-dlp command that works without global installs."""
    try:
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg_path = None

    command = [sys.executable, "-m", "yt_dlp"]
    if ffmpeg_path:
        command += ["--ffmpeg-location", ffmpeg_path]
    return command


def normalize_youtube_url(url):
    """Convert /v/VIDEO_ID?version=3 style RSS urls to standard watch urls."""
    match = re.search(r"(?:/v/|v=|embed/|shorts/)([A-Za-z0-9_-]{11})", url)
    if match:
        return f"https://www.youtube.com/watch?v={match.group(1)}"
    return url


def fetch_video_duration(command_prefix, url):
    """Return the video duration in seconds without downloading anything."""
    command = command_prefix + [
        "--skip-download",
        "--dump-single-json",
        "--no-playlist",
        url,
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    info = json.loads(result.stdout or "{}")
    return info.get("duration")


def _fetch_channel_feed(channel):
    """Fetch the channel RSS feed.

    Returns (root_element, feed_hash) or (None, None) when the feed
    content is identical to the last check, meaning no new videos.
    """
    rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel.channel_id}"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(rss_url, headers=headers)
    response.raise_for_status()

    content_hash = hashlib.sha256(response.content).hexdigest()
    if content_hash == channel.feed_hash:
        return None, None

    root = ET.fromstring(response.content)
    return root, content_hash


def _extract_video_urls(root):
    """Pull all media urls out of an RSS feed document."""
    urls = []
    for entry in root.findall("atom:entry", RSS_NS):
        media_content = entry.find("media:group/media:content", RSS_NS)
        if media_content is not None:
            url = media_content.attrib.get("url")
            if url:
                urls.append(url)
    return urls


def _download_channel_avatar(channel, root=None):
    """Download the channel profile picture.

    Tries the RSS feed thumbnail first; falls back to scraping the
    channel's YouTube page for og:image.
    """
    avatar_url = None

    # Try RSS feed thumbnail
    if root is not None:
        thumbnail = root.find("atom:entry/media:group/media:thumbnail", RSS_NS)
        if thumbnail is not None:
            avatar_url = thumbnail.attrib.get("url")

    # Fallback: scrape the channel page for og:image meta tag
    if not avatar_url:
        try:
            from bs4 import BeautifulSoup
            page_url = f"https://www.youtube.com/channel/{channel.channel_id}"
            resp = requests.get(page_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            og = soup.find("meta", property="og:image")
            if og and og.get("content"):
                avatar_url = og["content"]
        except Exception:
            pass

    if not avatar_url or channel.profile_picture:
        return

    try:
        resp = requests.get(avatar_url, timeout=15)
        resp.raise_for_status()
        ext = "jpg"
        ct = resp.headers.get("Content-Type", "")
        if "png" in ct:
            ext = "png"
        elif "webp" in ct:
            ext = "webp"
        filename = f"avatar_{channel.channel_id}.{ext}"
        from io import BytesIO
        channel.profile_picture.save(filename, File(BytesIO(resp.content)), save=False)
        channel.save(update_fields=["profile_picture"])
        print(f"[OK] Avatar downloaded for {channel.name}")
    except Exception as e:
        print(f"[ERROR] Avatar download failed for {channel.name}: {e}")


def fetch_and_save_media_urls(youtube_channel):
    """Initial fetch of media URLs right after a channel is added."""
    try:
        root, feed_hash = _fetch_channel_feed(youtube_channel)
        if root is None:
            return
        youtube_channel.feed_hash = feed_hash
        youtube_channel.save(update_fields=["feed_hash"])

        _download_channel_avatar(youtube_channel, root)

        for url in _extract_video_urls(root):
            media, created = MediaFile.objects.get_or_create(
                media_url=url,
                defaults={"youtube_channel": youtube_channel},
            )
            if created:
                print(f"[NEW] Media URL saved: {url}")
                download_new_audio(str(media.id))
    except Exception as e:
        print(f"[ERROR] Error fetching RSS: {e}")


@background(schedule=5)
def check_and_update_media_urls():
    """Every minute: check each channel's feed for NEW uploads only.

    Uses ETags so an unchanged feed costs one tiny 304 request and the
    rest of the function does not execute at all. When a new video is
    found its download is scheduled immediately - nothing else runs.
    """
    for channel in YouTubeChannel.objects.all():
        try:
            root, etag = _fetch_channel_feed(channel)
            if root is None:
                continue  # feed unchanged -> no new video on this channel

            channel.feed_hash = etag
            channel.save(update_fields=["feed_hash"])

            existing_urls = set(
                MediaFile.objects.filter(youtube_channel=channel).values_list(
                    "media_url", flat=True
                )
            )

            for url in _extract_video_urls(root):
                if url in existing_urls:
                    continue
                media = MediaFile.objects.create(
                    youtube_channel=channel,
                    media_url=url,
                    created_at=timezone.now(),
                )
                print(f"[NEW] Video uploaded on '{channel.name}': {url}")
                # Execute the download function ONLY for this new video.
                download_new_audio(str(media.id))
                existing_urls.add(url)

        except Exception as e:
            print(f"[ERROR] Error fetching RSS for {channel.name}: {e}")


def _process_media(media):
    """Duration-check then (maybe) download audio for a single media row."""
    filename_base = f"{media.youtube_channel.name}_{media.id}"
    filename = slugify(filename_base)
    if not filename:
        filename = re.sub(
            r"[^a-zA-Z0-9_-]",
            "_",
            f"channel_{media.youtube_channel.channel_id}_{media.id}",
        )

    command_prefix = get_ytdlp_command()
    normalized_url = normalize_youtube_url(media.media_url)

    # Fetch metadata once — duration + thumbnail URL in one call.
    duration = None
    thumb_url = None
    try:
        cmd = command_prefix + ["--skip-download", "--dump-single-json", "--no-playlist", normalized_url]
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        info = json.loads(result.stdout or "{}")
        duration = info.get("duration")
        thumb_url = info.get("thumbnail")
        if not thumb_url:
            for t in info.get("thumbnails", []):
                if t.get("url"):
                    thumb_url = t["url"]
                    break
    except Exception as e:
        print(f"[ERROR] Metadata fetch failed for {normalized_url}: {e}")

    media.duration_seconds = int(duration) if duration else None
    media.save()

    # Save the video thumbnail if we don't have one yet.
    if thumb_url and not media.thumbnail:
        try:
            resp = requests.get(thumb_url, timeout=15)
            resp.raise_for_status()
            ext = "jpg"
            ct = resp.headers.get("Content-Type", "")
            if "png" in ct:
                ext = "png"
            from io import BytesIO
            media.thumbnail.save(f"{filename}.{ext}", File(BytesIO(resp.content)), save=False)
            media.save(update_fields=["thumbnail"])
            print(f"[OK] Thumbnail saved for: {media.media_url}")
        except Exception as e:
            print(f"[ERROR] Thumbnail download failed for {media.media_url}: {e}")

    if media.duration_seconds is None:
        print(f"[SKIP] Could not determine duration (live/unfinished?): {media.media_url}")
        return
    if media.duration_seconds < MIN_DURATION_SECONDS:
        print(f"[SKIP] Under 2 minutes ({media.duration_seconds}s): {media.media_url}")
        return
    if media.duration_seconds > MAX_DURATION_SECONDS:
        print(f"[SKIP] Over 10 minutes ({media.duration_seconds}s): {media.media_url}")
        return

    # Download into a temp dir so MEDIA_ROOT stays clean and the FileField
    # never has to rename around existing files.
    temp_dir = tempfile.mkdtemp(prefix="ytaudio_")
    try:
        output_template = os.path.join(temp_dir, f"{filename}.%(ext)s")
        downloaded_path = os.path.join(temp_dir, f"{filename}.mp3")

        command = command_prefix + [
            "-x",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "0",
            "--no-playlist",
            "--output",
            output_template,
            normalized_url,
        ]

        result = subprocess.run(command, check=True, capture_output=True, text=True)

        if os.path.exists(downloaded_path):
            with open(downloaded_path, "rb") as audio_file:
                media.audio_file.save(f"{filename}.mp3", File(audio_file), save=False)
                media.downloaded_at = timezone.now()
                media.save()
            print(f"[OK] Downloaded ({media.duration_seconds}s): {media.media_url}")
        else:
            print(f"[ERROR] Audio file not found at {downloaded_path}")
            print(result.stdout[-2000:])
            print(result.stderr[-2000:])
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@background(schedule=1)
def download_new_audio(media_id):
    """Triggered only when a brand-new video URL was detected."""
    media = MediaFile.objects.filter(id=int(media_id)).first()
    if media is None or media.audio_file:
        return
    try:
        _process_media(media)
    except Exception as e:
        stderr = getattr(e, "stderr", "") or ""
        print(f"[ERROR] Error downloading audio for {media.media_url}: {e}")
        print(stderr[-2000:])


@background(schedule=10)
def download_audio():
    """Hourly safety net: retry anything that was never evaluated."""
    pending = MediaFile.objects.filter(audio_file='', duration_seconds__isnull=True)
    for media in pending:
        download_new_audio(str(media.id))
