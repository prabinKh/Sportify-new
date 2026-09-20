<div align="center">
  <h1>🎧 FuckSportify (Spotify Web Client & YouTube Audio Streaming Platform)</h1>
  <p>A modern, full-stack Spotify web application built with React 19, TypeScript, Redux Toolkit, Vite, and a Python/Django YouTube Audio API backend.</p>

  <p align="center">
    <img src="https://img.shields.io/badge/Spotify-1ED760?style=for-the-badge&logo=spotify&logoColor=white" alt="Spotify Badge">
    <img src="https://img.shields.io/badge/react-19-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React 19">
    <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/redux--toolkit-%23593d88.svg?style=for-the-badge&logo=redux&logoColor=white" alt="Redux Toolkit">
    <img src="https://img.shields.io/badge/vite-8.1-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
    <img src="https://img.shields.io/badge/django-python-%23092E20.svg?style=for-the-badge&logo=django&logoColor=white" alt="Django">
    <img src="https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge" alt="License">
  </p>
</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features & Functionality](#-key-features--functionality)
- [Screenshots & UI Showcase](#-screenshots--ui-showcase)
- [Tech Stack](#-tech-stack)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (Django API)](#1-backend-setup-django-youtube-audio-api)
  - [Frontend Setup (React + Vite)](#2-frontend-setup-react-19--vite)
- [🏠 LAN Jam Session (Friends on Same WiFi)](#-lan-jam-session-friends-on-same-wifi)
- [How to Use the Application](#-how-to-use-the-application)
- [API Architecture](#-api-architecture)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🏠 LAN Jam Session (Friends on Same WiFi)

> **No internet required for audio!** When your friends are all on the same home WiFi, you can run everything directly from your laptop and they connect via your local IP. Audio loads fast because it travels over LAN, not the internet.

### 🚀 One-Command Start

```bash
# From the project root:
./start_lan.sh
# OR:
npm run lan
```

This script automatically:
1. Detects your WiFi IP (e.g. `192.168.1.23`)
2. Updates `.env` with the correct IP
3. Starts the Django backend on `0.0.0.0:8000`
4. Starts the Vite frontend on your LAN IP
5. Prints the URL your friends need to open + a QR code (if `qrencode` is installed)

### 📱 Friends Join Like This

| Step | Action |
|------|--------|
| 1 | Make sure everyone is on **the same WiFi network** as your laptop |
| 2 | You run `./start_lan.sh` on your laptop |
| 3 | Script prints a URL like `http://192.168.1.23:3000` |
| 4 | Friends open that URL in their phone/laptop browser |
| 5 | Create or join a Room → select a song → everyone buffers → Play! |

### 🔊 How Volume Control Works

- The **host's volume slider** broadcasts a suggested volume to all listeners via WebSocket
- Each listener's in-app `<audio>` element volume is updated instantly
- ⚠️ This only controls the **in-app player volume**, not the device/OS volume — friends can still turn their own phone volume up/down with hardware buttons

### 🌐 Find Your LAN IP Manually

If the script can't auto-detect your IP:

```bash
# Mac:
ipconfig getifaddr en0   # WiFi
ipconfig getifaddr en1   # Ethernet

# Linux:
ip addr show | grep "inet " | grep -v 127.0.0.1

# Windows (run in CMD):
ipconfig | findstr "IPv4"
```

### ⚠️ Important Notes

- **Keep your laptop on and awake** — it's the server for the whole session
- **Firewall**: macOS may prompt to allow incoming connections on ports 3000 and 8000 — click Allow
- **IP may change**: Router DHCP can reassign your IP after a router restart. For a permanent fix, set a **static/reserved IP** for your laptop in your router's DHCP settings
- This works **only on the same WiFi**. For friends on different networks, use the public domain URL instead

---

## 🌟 Overview

**FuckSportify** is an all-in-one music streaming web platform that combines the sleek, premium user experience of Spotify with the power of a standalone Python/Django audio backend. 

With FuckSportify, you can browse music, listen to high-quality audio streams without mandatory OAuth login gates, host **real-time synchronized Jam Rooms** with friends, chat via **Direct Messages**, sing along with **Karaoke lyrics mode**, create and share customized playlists, and **download audio tracks as MP3** directly to your device.

---

## ✨ Key Features & Functionality

### 🎵 1. Dual Playback Engine & Demo Mode
- **Zero-Gate Demo Playback**: Start listening to audio streams right away without needing a paid Spotify Premium account.
- **Spotify Web Playback SDK**: Connect your Spotify account for full library sync and device control.
- **Interactive Player Bar**: Full controls with Play/Pause, Next/Previous, Seek slider, Volume adjust, Shuffle, Repeat, and Queue visualizer.

### 👥 2. Live Jam Session Rooms (`/rooms`, `/room/:code`)
- **Synchronized Listening**: Create or join live audio rooms with unique invite codes (e.g., `/room/WDDBVK`).
- **Real-time Host Control**: Synchronize track playback across all participants in the room.
- **Live In-Room Group Chat**: Send instant messages, see online member badges, and discuss tracks in real time.

### 💬 3. Social Direct Messaging (`/messages`)
- **1-on-1 Social Chat**: Real-time direct messaging between users.
- **Chat History & Read Statuses**: Seamless conversation switching, unread indicators, and mobile-friendly conversation drawer.

### 🎤 4. Synchronized Lyrics & Karaoke Mode (`/karaoke/:id`, `/track/:id`)
- **Interactive Karaoke Visualizer**: Sing along with full-screen, synchronized dynamic lyrics.
- **Track Insights**: Deep dive into individual song metadata, artist biographies, and albums.

### ⬇️ 5. One-Click MP3 Audio Downloader
- **Direct MP3 Export**: Download any track directly from the 3-dot action menu or song table.
- **Automated Metadata Tagging**: Downloaded files include album artwork, artist tags, and title information.

### 📁 6. Smart Playlists & Personal Library
- **Custom Playlists**: Create public or private playlists with custom covers and descriptions.
- **Drag & Drop Reordering**: Reorder songs in playlists effortlessly with touch and mouse drag support.
- **In-Playlist Search & Recommendations**: Discover and add recommended tracks directly from the bottom of your playlist.
- **Liked Songs Library**: Quick heart button toggle across all song rows and player bar.

### 🔍 7. Instant Search & Browse Catalog
- **Live Search**: Instant multi-category results for Tracks, Albums, Artists, and Playlists.
- **Recent Search History**: Persistent search caching for quick access to your favorite searches.
- **Browse Genres & Moods**: Explore curated genres, top hits, and daily mixes.

### 📱 8. 100% Mobile Responsive Design
- **Mobile Navigation Drawer**: Smooth slide-over portal for mobile menus, library access, and navigation.
- **Responsive Song Rows**: Mobile view displaying track thumbnail, title, artist, duration, and a 3-dot action dropdown with all available features.
- **Adaptive Player**: Compact bottom player bar optimized for touch screens and smaller viewports.

### 🌐 9. Multi-Language Support (i18n)
- Seamlessly toggle languages between **English** and **Spanish** (`react-i18next`).

---

## 📸 Screenshots & UI Showcase

<div align="center">
  <table>
    <tr>
      <td width="50%">
        <h4 align="center">🏠 Home Screen</h4>
        <img src="images/Home.png" alt="Home Screen" width="100%"/>
      </td>
      <td width="50%">
        <h4 align="center">🎵 Playlist & Recommendations</h4>
        <img src="images/playlist.png" alt="Playlist View" width="100%"/>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <h4 align="center">🔍 Real-time Search</h4>
        <img src="images/search.png" alt="Search Page" width="100%"/>
      </td>
      <td width="50%">
        <h4 align="center">🎨 Browse Categories & Genres</h4>
        <img src="images/browse.png" alt="Browse Categories" width="100%"/>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <h4 align="center">👤 Artist Discography & Top Tracks</h4>
        <img src="images/artist.png" alt="Artist Profile" width="100%"/>
      </td>
      <td width="50%">
        <h4 align="center">💿 Album View</h4>
        <img src="images/Album.png" alt="Album View" width="100%"/>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <h4 align="center">📱 Mobile Responsive View</h4>
        <img src="images/Mobile.png" alt="Mobile View" width="100%"/>
      </td>
      <td width="50%">
        <h4 align="center">➕ Create & Manage Playlists</h4>
        <img src="images/NewPlaylist.png" alt="Create Playlist" width="100%"/>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <h4 align="center">🎧 Connected Playback Devices</h4>
        <img src="images/CurrentDevices.png" alt="Playback Devices" width="100%"/>
      </td>
      <td width="50%">
        <h4 align="center">🌐 Multi-Language Selector</h4>
        <img src="images/LanguagueSelector.png" alt="Language Selector" width="100%"/>
      </td>
    </tr>
  </table>
</div>

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 8](https://vitejs.dev/) (Lightning-fast HMR)
- **State Management**: [Redux Toolkit (RTK)](https://redux-toolkit.js.org/), RTK Query & [Redux Persist](https://github.com/rt2zz/redux-persist)
- **UI Components & Icons**: [Ant Design (antd 5)](https://ant.design/), [React Icons](https://react-icons.github.io/react-icons/), Custom SVGs
- **Styling**: Vanilla SCSS / SASS modules with responsive variables & glassmorphism
- **Audio & Media**: HTML5 Audio API + Spotify Web Playback SDK
- **Internationalization**: `react-i18next` + `i18next`

### Backend (`youtube-audio-api/`)
- **Runtime & Framework**: [Python 3.10+](https://www.python.org/) + [Django](https://www.djangoproject.com/)
- **REST API**: [Django REST Framework (DRF)](https://www.django-rest-framework.org/)
- **Database**: SQLite / PostgreSQL
- **Background Tasks**: Django Background Tasks for stream extraction and audio caching
- **Authentication**: Session & Token Auth with custom User profiles

---

## ⚙️ Getting Started & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Python**: `v3.10` or higher
- **npm** or **yarn**
- **Git**

---

### 1. Backend Setup (Django YouTube Audio API)

```bash
# Navigate into the backend directory
cd youtube-audio-api

# Create and activate a Python virtual environment
python3 -m venv venv

# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# (Optional) Create superuser admin
python manage.py createsuperuser

# Start the Django server
python manage.py runserver 127.0.0.1:8000
```
The Django backend API will be running at `http://127.0.0.1:8000/`.

---

### 2. Frontend Setup (React 19 + Vite)

Open a new terminal window in the project root:

```bash
# Install frontend dependencies
npm install

# (Optional) Create .env configuration
cp .env.dist .env

# Start the Vite development server
npm run dev
```

Open `http://127.0.0.1:3000` in your browser.

#### Environment Variables (`.env`)

Create a `.env` file in the root directory (or copy from `.env.dist`):

```bash
cp .env.dist .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Django Backend API address. Set to your local server, LAN IP, or production backend domain. |
| `LOCAL_IP` | `127.0.0.1` | Local machine IP address (auto-detected when running `./start_lan.sh`). |
| `VITE_LOCAL_IP` | `127.0.0.1` | Local IP exposed to Vite frontend runtime. |
| `VITE_SPOTIFY_REDIRECT_URL` | `http://127.0.0.1:3000` | Spotify OAuth redirect URI (dynamically uses browser origin if unconfigured). |
| `VITE_SPOTIFY_CLIENT_ID` | *(Optional)* | Spotify Developer Client ID (required only for Spotify Web Playback SDK login). |

Example `.env` for local development:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SPOTIFY_REDIRECT_URL=http://127.0.0.1:3000
LOCAL_IP=127.0.0.1
VITE_LOCAL_IP=127.0.0.1
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
```

---

## 📖 How to Use the Application

1. **Playing Music**:
   - Click on any track card or row to start instant playback.
   - Use the bottom playback bar to control volume, seek, pause/play, and toggle repeat or shuffle.

2. **Creating & Managing Playlists**:
   - Click the `+` icon or **Create Playlist** in the left sidebar.
   - Choose a playlist title, description, and privacy setting (Public/Private).
   - Use the 3-dot menu (`...`) on any song or use the bottom recommendation bar to add songs.
   - Drag and drop tracks to change their order.

3. **Joining a Live Jam Room**:
   - Navigate to **Live Rooms** from the navbar.
   - Enter a 6-letter room code (e.g. `WDDBVK`) or click **Create Room**.
   - Share the room code with friends to listen together and chat live.

4. **Sending Direct Messages**:
   - Click **Messages** in the top navigation bar.
   - Pick a contact to start chatting in real time.

5. **Karaoke & Lyrics**:
   - Click the 3-dot menu on any track and select **Karaoke Page** (or click the microphone icon in the player bar) to open the synced lyrics screen.

6. **Downloading Songs as MP3**:
   - Click the 3-dot button on any song row and select **Download Audio (MP3)** to save the audio locally.

---

## 🔌 API Architecture & Swagger Documentation

### 📚 Interactive Swagger UI & API Docs
- **Swagger UI**: [`http://127.0.0.1:8000/api/docs/`](http://127.0.0.1:8000/api/docs/) (or [`/api/swagger/`](http://127.0.0.1:8000/api/swagger/))
- **ReDoc Documentation**: [`http://127.0.0.1:8000/api/redoc/`](http://127.0.0.1:8000/api/redoc/)
- **OpenAPI 3.0 Schema**: [`http://127.0.0.1:8000/api/schema/`](http://127.0.0.1:8000/api/schema/)

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/docs/` | `GET` | Interactive Swagger UI API Documentation |
| `/api/redoc/` | `GET` | ReDoc API Documentation |
| `/api/schema/` | `GET` | OpenAPI 3.0 JSON Schema |
| :--- | :---: | :--- |
| `/api/tracks/` | `GET` | List all cached audio tracks |
| `/api/tracks/search/?q={query}` | `GET` | Search YouTube audio catalogue |
| `/api/playlists/` | `GET`, `POST` | List and create customized playlists |
| `/api/playlists/<id>/` | `GET`, `PATCH`, `DELETE` | Retrieve, update or delete a playlist |
| `/api/playlists/<id>/tracks/` | `POST`, `DELETE` | Add or remove tracks from a playlist |
| `/api/rooms/` | `GET`, `POST` | List and create live audio Jam Rooms |
| `/api/rooms/<id>/messages/` | `GET`, `POST` | Room live chat messages |
| `/api/messages/` | `GET`, `POST` | Direct messages between users |
| `/api/favorites/` | `GET`, `POST`, `DELETE` | Manage user liked tracks |
| `/api/download/<id>/` | `GET` | Trigger audio stream extraction and MP3 download |

---

## 📦 Production Build

To bundle the frontend for production:

```bash
npm run build
```
The optimized production bundle will be generated in the `build/` directory.

---

