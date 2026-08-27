<img width="1650" alt="Screenshot 2025-04-16 at 23 48 07" src="https://github.com/user-attachments/assets/b1e909f4-d718-4712-a775-66851828f848" />


<img width="1673" alt="Screenshot 2025-04-16 at 23 51 12" src="https://github.com/user-attachments/assets/9dd4f5c5-e101-46be-b621-df79878ce8a5" />

<img width="1668" alt="Screenshot 2025-04-16 at 23 50 55" src="https://github.com/user-attachments/assets/41a37141-9000-4cdd-b024-d6682dc6f60a" />





<img width="1509" alt="Screenshot 2025-04-16 at 23 54 50" src="https://github.com/user-attachments/assets/67e3d979-b14f-49dd-b459-9819bb6f66e9" />

<img width="1542" alt="Screenshot 2025-04-16 at 23 55 09" src="https://github.com/user-attachments/assets/5670852c-52c9-4fe9-ae40-1d07f0cc6ae6" />

<img width="1499" alt="Screenshot 2025-04-16 at 23 55 19" src="https://github.com/user-attachments/assets/c86273a6-dbf3-4802-b810-c2706366c906" />

<img width="1370" alt="Screenshot 2025-04-16 at 23 55 40" src="https://github.com/user-attachments/assets/e7f47c54-56ba-403b-a632-bd0f9b77a034" />

# YouTube Audio Downloader
A Django-based web application that automatically downloads audio from YouTube channels. The application monitors specified YouTube channels and downloads new audio content as it becomes available.

## Features

- **Channel Management**: Add and manage YouTube channels to monitor
- **Automatic URL Monitoring**: Regularly checks for new media URLs from subscribed channels
- **Background Processing**: Uses Django Background Tasks for automated downloading
- **Audio Download**: Automatically downloads audio from new videos
- **User Authentication**: Secure login system for managing channels
- **REST API Support**: Built with Django REST Framework for API access

## Prerequisites

- Python 3.x
- Django 5.1
- yt-dlp
- Other dependencies listed in requirements.txt

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ytaudio
```

2. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set up the database:

```bash
python manage.py migrate
```

5. Create a superuser:

```bash
python manage.py createsuperuser
```

6. Start the development server:

```bash
python manage.py runserver
```

7. Start the background tasks:

```bash
python manage.py process_tasks
```

## Usage

1. Access the application at `http://localhost:8000`
2. Log in with your superuser credentials
3. Add YouTube channels to monitor:
   - Navigate to the channel list page
   - Click "Add Channel" and enter the YouTube channel URL
4. The system will automatically:
   - Check for new media URLs every minute
   - Download audio from new videos every 5 minutes

## Project Structure

- `downloader/`: Main application directory
  - `models.py`: Database models for channels, media URLs, and downloaded audio
  - `views.py`: View functions for web interface
  - `utils.py`: Utility functions for YouTube operations
  - `templates/`: HTML templates
  - `static/`: Static files (CSS, JavaScript)
  - `media/`: Downloaded audio files

## Background Tasks

The application uses two main background tasks:

1. `check_and_update_media_urls()`: Runs every minute to check for new media URLs
2. `download_audio()`: Runs every 5 minutes to download new audio files

## Configuration

Key settings in `settings.py`:

- `MEDIA_ROOT`: Directory for storing downloaded audio files
- `MAX_ATTEMPTS`: Maximum number of attempts for background tasks
- `MAX_RUN_TIME`: Maximum runtime for background tasks

## API Endpoints

The application provides REST API endpoints for:

- Channel management
- Media URL listing
- Downloaded audio access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request



## Acknowledgments

- Django Framework
- yt-dlp for YouTube downloading
- Django Background Tasks for task scheduling
