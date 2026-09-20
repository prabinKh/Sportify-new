FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=ytaudio.settings

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg nodejs \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p static media staticfiles database \
  && chmod +x entrypoint.sh \
  && python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["./entrypoint.sh"]
