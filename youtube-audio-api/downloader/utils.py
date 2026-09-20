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

from .models import YouTubeChannel, MediaFile, Playlist

MIN_DURATION_SECONDS = 120      # Skip audio shorter than 2 minutes (120 seconds)
MAX_DURATION_SECONDS = 600      # Skip audio longer than 10 minutes (600 seconds)

RSS_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "media": "http://search.yahoo.com/mrss/",
    "yt": "http://www.youtube.com/xml/schemas/2015",
}


def _find_cookies_file():
    """Return path to a valid cookies.txt file, or None.

    Search order:
      1. DownloaderSetting model (cookies_file field or cookies_text)
      2. /app/database/cookies.txt  (Docker volume mount)
      3. /app/cookies.txt           (Docker build-time copy)
    """
    # 1. Check the database model first
    try:
        from .models import DownloaderSetting
        setting = DownloaderSetting.objects.first()
        if setting:
            # cookies_file is a FileField
            if setting.cookies_file and hasattr(setting.cookies_file, 'path'):
                try:
                    path = setting.cookies_file.path
                    if os.path.exists(path):
                        return path
                except Exception:
                    pass
            # cookies_text: write to a stable tmp location so we don't create a new file each call
            if setting.cookies_text and setting.cookies_text.strip():
                tmp_path = "/tmp/yt_cookies_db.txt"
                with open(tmp_path, "w") as f:
                    f.write(setting.cookies_text)
                return tmp_path
    except Exception:
        pass  # DB not ready yet (e.g. during migrations)

    # 2 & 3. Check well-known paths
    for candidate in ["/app/database/cookies.txt", "/app/cookies.txt"]:
        if os.path.exists(candidate):
            return candidate

    return None


def _get_ytdlp_opts(extra_opts=None):
    """Return standard yt-dlp Python API configuration options."""
    opts = {
        'force_ipv4': True,
        'nocheckcertificate': True,
        'geo_bypass': True,
        'quiet': True,
        'no_warnings': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'extractor_args': {'youtube': {'player_client': ['visionos', 'mweb', 'android', 'ios', 'web']}},
    }
    cookies_path = _find_cookies_file()
    if cookies_path:
        opts['cookiefile'] = cookies_path
    if extra_opts:
        opts.update(extra_opts)
    return opts


def _fetch_info_inprocess(url, flat=False):
    """Fetch video or channel metadata using in-process yt-dlp Python API."""
    import yt_dlp
    opts = _get_ytdlp_opts({'extract_flat': flat, 'skip_download': True})
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


def _download_audio_inprocess(url, output_template):
    """Download audio using in-process yt-dlp Python API to bypass subprocess Windows AppLocker policy blocks."""
    import yt_dlp
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        try:
            import imageio_ffmpeg
            candidate = imageio_ffmpeg.get_ffmpeg_exe()
            if candidate and os.path.exists(candidate):
                ffmpeg_path = candidate
        except Exception:
            ffmpeg_path = None

    opts = _get_ytdlp_opts({
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'noplaylist': True,
    })

    if ffmpeg_path and os.path.exists(ffmpeg_path):
        opts['ffmpeg_location'] = ffmpeg_path
        opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '0',
        }]

    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])


def get_ytdlp_command():
    """Build a yt-dlp command that works reliably on both local and server environments.

    Automatically includes --cookies <path> when a cookies.txt file is found, which
    is required to bypass YouTube's bot-detection on datacenter / VPS IP addresses.
    """
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        try:
            import imageio_ffmpeg
            candidate = imageio_ffmpeg.get_ffmpeg_exe()
            if candidate and os.path.exists(candidate):
                ffmpeg_path = candidate
        except Exception:
            ffmpeg_path = None

    ytdlp_bin = shutil.which("yt-dlp")
    if ytdlp_bin:
        base_cmd = [ytdlp_bin]
    else:
        base_cmd = [sys.executable, "-m", "yt_dlp"]

    # visionos + mweb + android + ios + web clients bypass bot-detection better on datacenter IPs
    command = base_cmd + [
        "--force-ipv4",
        "--no-check-certificates",
        "--geo-bypass",
        "--extractor-args", "youtube:player_client=visionos,mweb,android,ios,web",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--sleep-requests", "1",   # 1-second pause between requests to reduce 429 errors
    ]

    # Inject cookies file when available (required for datacenter VPS downloads)
    cookies_path = _find_cookies_file()
    if cookies_path:
        command += ["--cookies", cookies_path]
        print(f"[COOKIES] Using cookies file: {cookies_path}")

    if ffmpeg_path and os.path.exists(ffmpeg_path):
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


def _get_channel_base_url(channel_id):
    """Normalize channel ID, handle, or URL into a base YouTube URL."""
    cid = str(channel_id).strip()
    if cid.startswith("http://") or cid.startswith("https://"):
        return cid.rstrip("/")
    if cid.startswith("@"):
        return f"https://www.youtube.com/{cid}"
    if cid.startswith("UC"):
        return f"https://www.youtube.com/channel/{cid}"
    return f"https://www.youtube.com/@{cid}"


def _fetch_channel_feed(channel):
    """Fetch the channel RSS feed safely without throwing.

    Returns (root_element, feed_hash) or (None, None) when the feed
    is unavailable or identical to the last check.
    """
    try:
        cid = str(channel.channel_id).strip()
        if not cid.startswith("UC") or len(cid) != 24:
            # RSS feed only works for standard 24-character UC... channel IDs
            return None, None

        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"
        headers = {"User-Agent": "Mozilla/5.0"}

        response = requests.get(rss_url, headers=headers, timeout=8)
        if not response.ok:
            return None, None

        content_hash = hashlib.sha256(response.content).hexdigest()
        if content_hash == channel.feed_hash:
            return None, None

        root = ET.fromstring(response.content)
        return root, content_hash
    except Exception as e:
        print(f"[WARN] RSS feed check skipped for '{channel.name}': {e}")
        return None, None


def _extract_video_urls(root):
    """Pull all media urls out of an RSS feed document and normalize them."""
    urls = []
    for entry in root.findall("atom:entry", RSS_NS):
        media_content = entry.find("media:group/media:content", RSS_NS)
        if media_content is not None:
            url = media_content.attrib.get("url")
            if url:
                urls.append(normalize_youtube_url(url))
        else:
            link = entry.find("atom:link", RSS_NS)
            if link is not None:
                href = link.attrib.get("href")
                if href:
                    urls.append(normalize_youtube_url(href))
    return urls


def _download_channel_avatar(channel, root=None):
    """Download the channel profile picture safely."""
    if channel.profile_picture:
        return

    avatar_url = None

    # 1. Try RSS feed thumbnail
    if root is not None:
        try:
            thumbnail = root.find("atom:entry/media:group/media:thumbnail", RSS_NS)
            if thumbnail is not None:
                avatar_url = thumbnail.attrib.get("url")
        except Exception:
            pass

    # 2. Scrape channel page for og:image meta tag
    base_url = _get_channel_base_url(channel.channel_id)
    if not avatar_url:
        try:
            from bs4 import BeautifulSoup
            resp = requests.get(base_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            if resp.ok:
                soup = BeautifulSoup(resp.text, "html.parser")
                og = soup.find("meta", property="og:image")
                if og and og.get("content"):
                    avatar_url = og["content"]
        except Exception:
            pass

    # 3. Secondary fallback: yt-dlp thumbnail extraction
    if not avatar_url:
        try:
            cmd = get_ytdlp_command() + ["--skip-download", "--dump-single-json", "--playlist-items", "0", base_url]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if res.returncode == 0:
                data = json.loads(res.stdout or "{}")
                for thumb in data.get("thumbnails", []):
                    if thumb.get("url"):
                        avatar_url = thumb["url"]
                        break
        except Exception:
            pass

    if not avatar_url:
        return

    try:
        resp = requests.get(avatar_url, timeout=15)
        if resp.ok:
            ext = "jpg"
            ct = resp.headers.get("Content-Type", "")
            if "png" in ct:
                ext = "png"
            elif "webp" in ct:
                ext = "webp"
            filename = f"avatar_{channel.id}_{slugify(channel.name)}.{ext}"
            from io import BytesIO
            channel.profile_picture.save(filename, File(BytesIO(resp.content)), save=False)
            channel.save(update_fields=["profile_picture"])
            print(f"[OK] Avatar downloaded for {channel.name}")
    except Exception as e:
        print(f"[ERROR] Avatar download failed for {channel.name}: {e}")


def _extract_all_video_urls_via_ytdlp(channel_id):
    """Fetch all video watch URLs for a channel using yt-dlp."""
    command_prefix = get_ytdlp_command()
    base_url = _get_channel_base_url(channel_id)
    url = f"{base_url}/videos"
    cmd = command_prefix + ["--flat-playlist", "--dump-single-json", url]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, encoding="utf-8")
        info = json.loads(result.stdout or "{}")
        entries = info.get("entries", [])
        urls = []
        for entry in entries:
            video_id = entry.get("id")
            duration = entry.get("duration")
            # Filter by duration: skip < 2 min (120s) and >= 10 min (600s)
            if duration is not None:
                if duration < MIN_DURATION_SECONDS or duration >= MAX_DURATION_SECONDS:
                    continue
            if video_id:
                urls.append(f"https://www.youtube.com/watch?v={video_id}")
        return urls
    except Exception as e:
        print(f"[ERROR] yt-dlp channel video list fetch failed for {channel_id}: {e}")
        return []


def _extract_home_video_urls(channel_id):
    """Fetch video watch URLs from the channel's home/featured page."""
    video_ids = []
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    base_url = _get_channel_base_url(channel_id)

    # 1. Scrape channel home page for watch URLs
    try:
        resp = requests.get(base_url, headers=headers, timeout=12)
        if resp.ok:
            found = re.findall(r"/watch\?v=([A-Za-z0-9_-]{11})", resp.text)
            for vid in found:
                if vid not in video_ids:
                    video_ids.append(vid)
    except Exception as e:
        print(f"[WARN] Error scraping home page for {channel_id}: {e}")

    # 2. Also check featured tab if home returned few results
    if len(video_ids) < 5:
        try:
            feat_url = f"{base_url}/featured"
            resp = requests.get(feat_url, headers=headers, timeout=12)
            if resp.ok:
                found = re.findall(r"/watch\?v=([A-Za-z0-9_-]{11})", resp.text)
                for vid in found:
                    if vid not in video_ids:
                        video_ids.append(vid)
        except Exception:
            pass

    return [f"https://www.youtube.com/watch?v={vid}" for vid in video_ids]


def _cleanup_channel_duplicates(youtube_channel):
    """Delete any duplicate MediaFile records in the database for this channel."""
    seen_vids = set()
    # Order so downloaded audio is kept first
    qs = MediaFile.objects.filter(youtube_channel=youtube_channel).order_by('-audio_file', '-downloaded_at', '-id')
    for media in qs:
        match = re.search(r"(?:/v/|v=|embed/|shorts/)([A-Za-z0-9_-]{11})", media.media_url or "")
        vid = media.video_id or (match.group(1) if match else media.media_url)
        if vid in seen_vids:
            print(f"[CLEANUP] Deleting duplicate MediaFile ID {media.id} ({media.media_url})")
            media.delete()
        else:
            seen_vids.add(vid)


def _extract_channel_playlists_via_ytdlp(youtube_channel):
    """Extract playlists from /playlists, download all audio, and save in artist-specific playlists."""
    command_prefix = get_ytdlp_command()
    base_url = _get_channel_base_url(youtube_channel.channel_id)
    url = f"{base_url}/playlists"
    cmd = command_prefix + ["--flat-playlist", "--dump-single-json", url]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, encoding="utf-8")
        info = json.loads(result.stdout or "{}")
        entries = info.get("entries", [])
        print(f"[PLAYLISTS] Found {len(entries)} playlists for channel '{youtube_channel.name}'")

        for entry in entries:
            pl_id = entry.get("id")
            pl_title = (entry.get("title") or "").strip()
            if not pl_id or not pl_title:
                continue

            # Create or get artist playlist
            playlist, _ = Playlist.objects.get_or_create(
                channel=youtube_channel,
                playlist_id=pl_id,
                defaults={
                    "name": pl_title,
                    "description": f"Playlist by {youtube_channel.name}",
                },
            )
            if playlist.name != pl_title:
                playlist.name = pl_title
                playlist.save(update_fields=["name"])

            # Extract all videos inside this playlist
            pl_url = f"https://www.youtube.com/playlist?list={pl_id}"
            pl_cmd = command_prefix + ["--flat-playlist", "--dump-single-json", pl_url]
            try:
                pl_result = subprocess.run(pl_cmd, check=True, capture_output=True, text=True, encoding="utf-8")
                pl_info = json.loads(pl_result.stdout or "{}")
                video_entries = pl_info.get("entries", [])
                print(f"[PLAYLIST] '{pl_title}' ({pl_id}): {len(video_entries)} videos found")

                for ventry in video_entries:
                    v_id = ventry.get("id")
                    if not v_id:
                        continue
                    v_title = ventry.get("title") or ""
                    v_duration = ventry.get("duration")
                    if v_duration is not None:
                        if v_duration < MIN_DURATION_SECONDS or v_duration >= MAX_DURATION_SECONDS:
                            continue
                    v_url = f"https://www.youtube.com/watch?v={v_id}"

                    media, created = MediaFile.objects.get_or_create(
                        media_url=v_url,
                        defaults={
                            "youtube_channel": youtube_channel,
                            "title": v_title,
                            "video_id": v_id,
                            "duration_seconds": int(v_duration) if v_duration else None,
                        },
                    )
                    # Associate track with artist playlist
                    playlist.tracks.add(media)

                    # Download audio if not downloaded yet
                    if created or not media.audio_file:
                        queue_media_download(media.id)

            except Exception as pe:
                print(f"[ERROR] Failed fetching items for playlist '{pl_title}' ({pl_id}): {pe}")

    except Exception as e:
        print(f"[ERROR] Failed fetching playlists for {youtube_channel.name}: {e}")


def fetch_and_save_media_urls(youtube_channel):
    """Fetch media URLs from /videos, home, and /playlists.
    Deduplicate home and videos (delete duplicate URLs and skip duplicate downloads).
    Extract playlists, download their audio, and save them in artist playlists.
    """
    from django.db import connection
    try:
        print(f"[START] Beginning full media fetch for channel: '{youtube_channel.name}' (ID: {youtube_channel.channel_id})")

        # 0. Fetch avatar
        root = None
        try:
            root, feed_hash = _fetch_channel_feed(youtube_channel)
            if root is not None:
                youtube_channel.feed_hash = feed_hash
                youtube_channel.save(update_fields=["feed_hash"])
        except Exception as fe:
            print(f"[WARN] Feed fetch failed for {youtube_channel.name}: {fe}")

        try:
            _download_channel_avatar(youtube_channel, root)
        except Exception as ae:
            print(f"[WARN] Avatar download failed for {youtube_channel.name}: {ae}")

        channel_id = youtube_channel.channel_id

        # 1/3 Query /videos
        print(f"[FETCH] 1/3 Querying /videos for channel '{youtube_channel.name}' ({channel_id})...")
        videos_urls = _extract_all_video_urls_via_ytdlp(channel_id)
        if not videos_urls and root is not None:
            print("[FETCH] Falling back to RSS feed urls.")
            videos_urls = _extract_video_urls(root)

        # 2/3 Query home page
        print(f"[FETCH] 2/3 Querying home page for channel '{youtube_channel.name}' ({channel_id})...")
        home_urls = _extract_home_video_urls(channel_id)

        # Deduplicate between Home and Videos:
        # If home and video have the same URLs, delete/skip duplicate URLs so they are not downloaded twice.
        seen_vids = set()
        unique_urls = []
        duplicate_count = 0

        for url in videos_urls:
            match = re.search(r"(?:/v/|v=|embed/|shorts/)([A-Za-z0-9_-]{11})", url)
            vid = match.group(1) if match else url
            if vid not in seen_vids:
                seen_vids.add(vid)
                unique_urls.append(url)

        for url in home_urls:
            match = re.search(r"(?:/v/|v=|embed/|shorts/)([A-Za-z0-9_-]{11})", url)
            vid = match.group(1) if match else url
            if vid in seen_vids:
                duplicate_count += 1
                # Duplicate between home and video: delete/ignore duplicate so it's not downloaded twice
                continue
            seen_vids.add(vid)
            unique_urls.append(url)

        print(f"[DEDUP] Channel '{youtube_channel.name}': {len(videos_urls)} video URLs, {len(home_urls)} home URLs. Skipped {duplicate_count} duplicates. {len(unique_urls)} unique URLs.")

        # Save unique media URLs & queue downloads
        for url in unique_urls:
            media, created = MediaFile.objects.get_or_create(
                media_url=url,
                defaults={"youtube_channel": youtube_channel},
            )
            if created or not media.audio_file:
                print(f"[QUEUE] Queued for download: {url} (created={created})")
                queue_media_download(media.id)

        # Delete any existing duplicate MediaFile records from DB for this channel
        _cleanup_channel_duplicates(youtube_channel)

        # 3/3 Query /playlists, extract playlist names, download audio, save to artist playlists
        print(f"[FETCH] 3/3 Querying /playlists for channel '{youtube_channel.name}' ({channel_id})...")
        _extract_channel_playlists_via_ytdlp(youtube_channel)
        print(f"[DONE] Completed fetch and queue for channel '{youtube_channel.name}'")

    except Exception as e:
        print(f"[ERROR] Error fetching channel media for {youtube_channel.name}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        connection.close()


def fetch_all_historical_channels():
    """Ensure all channels in the DB have all their historical URLs fetched."""
    for channel in YouTubeChannel.objects.all():
        fetch_and_save_media_urls(channel)



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
                queue_media_download(media.id)
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

    info = {}
    try:
        info = _fetch_info_inprocess(normalized_url)
    except Exception as e:
        print(f"[WARN] In-process metadata fetch failed for {normalized_url}: {e}, trying fallback...")
        try:
            cmd = command_prefix + ["--skip-download", "--dump-single-json", "--no-playlist", normalized_url]
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            info = json.loads(result.stdout or "{}")
        except Exception as e2:
            print(f"[ERROR] All metadata fetch attempts failed for {normalized_url}: {e2}")

    duration = info.get("duration")
    thumb_url = info.get("thumbnail")
    title = info.get("title", '')
    video_id = info.get("id", '')
    if not thumb_url:
        for t in info.get("thumbnails", []):
            if t.get("url"):
                thumb_url = t["url"]
                break

    duration_int = int(duration) if duration else None

    # --- Duration gate: delete the record if it is out of the allowed range ---
    # Allowed range: MIN_DURATION_SECONDS (2 min / 120 s) to MAX_DURATION_SECONDS (10 min / 600 s)
    if duration_int is not None:
        if duration_int < MIN_DURATION_SECONDS:
            print(f"[DELETE] Under {MIN_DURATION_SECONDS}s ({duration_int}s) – removing from DB: {media.media_url}")
            media.delete()
            return
        if duration_int > MAX_DURATION_SECONDS:
            print(f"[DELETE] Over {MAX_DURATION_SECONDS}s ({duration_int}s) – removing from DB: {media.media_url}")
            media.delete()
            return

    media.duration_seconds = duration_int
    if title:
        media.title = title
    if video_id:
        media.video_id = video_id
    media.save()

    # Normalize media_url on existing record if it is in old /v/ format
    if normalized_url != media.media_url and not MediaFile.objects.filter(media_url=normalized_url).exclude(id=media.id).exists():
        media.media_url = normalized_url
        media.save(update_fields=["media_url"])

    # Save the video thumbnail only for tracks that passed the duration gate.
    if not media.thumbnail:
        vid = media.video_id
        if not vid:
            match = re.search(r"(?:/v/|v=|embed/|shorts/)([A-Za-z0-9_-]{11})", normalized_url)
            if match:
                vid = match.group(1)
                media.video_id = vid

        thumb_candidates = []
        if thumb_url:
            thumb_candidates.append(thumb_url)
        if vid:
            thumb_candidates.extend([
                f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg",
                f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
            ])

        for t_url in thumb_candidates:
            try:
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                resp = requests.get(t_url, headers=headers, timeout=15)
                if resp.ok and len(resp.content) > 1000:
                    ext = "jpg"
                    ct = resp.headers.get("Content-Type", "")
                    if "png" in ct:
                        ext = "png"
                    elif "webp" in ct:
                        ext = "webp"
                    from io import BytesIO
                    media.thumbnail.save(f"{filename}.{ext}", File(BytesIO(resp.content)), save=False)
                    media.save(update_fields=["thumbnail"])
                    print(f"[OK] Thumbnail saved for: {media.media_url}")
                    break
            except Exception as te:
                print(f"[WARN] Thumbnail download failed for {t_url}: {te}")

    # Download into a temp dir so MEDIA_ROOT stays clean and the FileField
    # never has to rename around existing files.
    temp_dir = tempfile.mkdtemp(prefix="ytaudio_")
    try:
        output_template = os.path.join(temp_dir, f"{filename}.%(ext)s")
        downloaded_path = os.path.join(temp_dir, f"{filename}.mp3")

        try:
            _download_audio_inprocess(normalized_url, output_template)
        except Exception as err:
            print(f"[WARN] In-process yt-dlp audio download error for {normalized_url}: {err}, trying subprocess fallback...")
            try:
                command = command_prefix + [
                    "-x", "--audio-format", "mp3", "--audio-quality", "0",
                    "--no-playlist", "--output", output_template, normalized_url,
                ]
                subprocess.run(command, check=True, capture_output=True, text=True)
            except Exception as fe:
                print(f"[ERROR] Subprocess fallback download also failed for {normalized_url}: {fe}")

        actual_file = None
        if os.path.exists(downloaded_path):
            actual_file = downloaded_path
        else:
            candidates = [
                f for f in glob.glob(os.path.join(temp_dir, f"{filename}.*"))
                if os.path.isfile(f) and not f.endswith(('.json', '.part', '.ytdl', '.temp'))
            ]
            if candidates:
                candidates.sort(key=lambda c: (not c.endswith('.mp3'), not c.endswith('.m4a'), not c.endswith('.opus')))
                actual_file = candidates[0]

        if actual_file and os.path.exists(actual_file):
            ext = os.path.splitext(actual_file)[1].lstrip('.') or 'mp3'
            with open(actual_file, "rb") as audio_file:
                media.audio_file.save(f"{filename}.{ext}", File(audio_file), save=False)
                media.downloaded_at = timezone.now()
                media.save()
            print(f"[OK] Downloaded and saved ({media.duration_seconds}s): {media.media_url} -> {media.audio_file.name}")
        else:
            print(f"[ERROR] No audio file produced for {media.media_url}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


import threading
from concurrent.futures import ThreadPoolExecutor

_download_executor = None
_executor_lock = threading.Lock()


def get_download_executor():
    """Return a healthy ThreadPoolExecutor, recreating it if shut down."""
    global _download_executor
    with _executor_lock:
        if _download_executor is None or getattr(_download_executor, '_shutdown', False):
            _download_executor = ThreadPoolExecutor(max_workers=5)
        return _download_executor


def _async_download_worker(media_id):
    from django.db import connection
    try:
        media = MediaFile.objects.filter(id=int(media_id)).first()
        if media and not media.audio_file:
            _process_media(media)
    except Exception as e:
        print(f"[ERROR] Async thread download error for media {media_id}: {e}")
    finally:
        connection.close()


def queue_media_download(media_id):
    """Queue media download in background thread pool immediately, with safe fallback."""
    try:
        executor = get_download_executor()
        executor.submit(_async_download_worker, media_id)
    except Exception as e:
        print(f"[WARN] Thread pool unavailable ({e}), launching daemon thread for media {media_id}")
        threading.Thread(target=_async_download_worker, args=(media_id,), daemon=True).start()

    try:
        download_new_audio(str(media_id))
    except Exception:
        pass


def process_all_pending_audio():
    """Trigger downloads for all MediaFiles without audio."""
    pending = MediaFile.objects.filter(audio_file='')
    print(f"[QUEUE] Queuing {pending.count()} pending media files for download...")
    for media in pending:
        queue_media_download(media.id)


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
        queue_media_download(media.id)

