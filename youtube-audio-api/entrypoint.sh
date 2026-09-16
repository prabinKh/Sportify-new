#!/bin/sh
set -e

echo "=== [Sportify API] Running database migrations ==="
python manage.py migrate --noinput

echo "=== [Sportify API] Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== [Sportify API] Initializing recurring background tasks ==="
python manage.py start_background_tasks || true

echo "=== [Sportify API] Starting background task worker daemon ==="
(
  while true; do
    python manage.py process_tasks || true
    sleep 5
  done
) &

echo "=== [Sportify API] Starting download retry worker in background ==="
(
  sleep 5
  python manage.py retry_downloads || true
) &

echo "=== [Sportify API] Starting Daphne ASGI server on 0.0.0.0:8000 ==="
exec daphne -b 0.0.0.0 -p 8000 ytaudio.asgi:application
