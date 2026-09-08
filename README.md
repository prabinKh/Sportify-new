<div align="center">
  <h1>🎧 Sportify-new (Spotify Web Client + YouTube Audio API)</h1>
  <p>A full-featured, modern Spotify React web application integrated with a Python/Django YouTube Audio API backend.</p>

<p align="center">
  <img src="https://img.shields.io/badge/Spotify-1ED760?style=for-the-badge&logo=spotify&logoColor=white" alt="Spotify Badge">
  <img src="https://img.shields.io/badge/react-19-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React Badge">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="Typescript Badge">
  <img src="https://img.shields.io/badge/redux--toolkit-%23593d88.svg?style=for-the-badge&logo=redux&logoColor=white" alt="Redux Badge">
  <img src="https://img.shields.io/badge/vite-8.1-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite Badge">
  <img src="https://img.shields.io/badge/django-python-%23092E20.svg?style=for-the-badge&logo=django&logoColor=white" alt="Django Badge">
</p>
</div>

---

## 🚀 Features

- 🎵 **Dual Playback System**: Supports Spotify Web Playback SDK for authenticated users and YouTube Audio API for streaming tracks directly.
- ⚡ **Bypass Auth / Demo Mode**: Explore and play tracks seamlessly without mandatory OAuth login gates.
- 🔍 **Real-time Music Search & Suggestions**: Instant search across tracks, albums, artists, and playlists with recent search history.
- 🎧 **Interactive Music Player**: Full playback bar with play/pause, seek, volume control, track progress, queue management, and lyrics view.
- 📁 **Personal Library & Playlists**: Create, update, and manage customized playlists and liked songs.
- 🌐 **Internationalization (i18n)**: Multi-language support (English, Spanish) powered by `react-i18next`.
- 🐍 **Django Audio Engine (`youtube-audio-api`)**: Python/Django backend for fetching, caching, and serving YouTube audio streams with automated background tasks.

---

## 🛠 Tech Stack

### Frontend
- **React 19** & **TypeScript**
- **Redux Toolkit** & **Redux Persist**
- **Vite 8** for fast HMR development and production bundling
- **Ant Design (antd)** & **Vanilla CSS / SASS**
- **Spotify Web API & Playback SDK**

### Backend (`youtube-audio-api/`)
- **Python** & **Django**
- **Django REST Framework**
- **Background Tasks** for asynchronous fetching and downloads
- **SQLite** for metadata storage

---

## 📸 Screenshots

See more in the [images folder](https://github.com/prabinKh/Sportify-new/tree/main/images).

<div align="center">
  <table>
    <tr>
      <td>
        <img src="images/Home.png" alt="Home Screen"/>
        <img src="images/CurrentDevices.png" alt="Playback Devices"/>
      </td>
      <td>
        <img src="images/NewPlaylist.png" alt="New Playlist"/>
        <img src="images/browse.png" alt="Browse Music"/>
      </td>
      <td>
        <img src="images/Profile.png" alt="User Profile"/>
        <img src="images/playlist.png" alt="Playlist View"/>
      </td>
    </tr>
  </table>
</div>

---

## ⚙️ Installation & Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/prabinKh/Sportify-new.git
cd Sportify-new
```

### 2. Frontend Setup (React + Vite)

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Create environment variable file `.env`:
   ```bash
   cp .env.dist .env
   ```
   Fill in your Spotify Client credentials (optional for standard playback, required for full OAuth):
   ```env
   VITE_SPOTIFY_CLIENT_ID=<your_spotify_client_id>
   VITE_SPOTIFY_REDIRECT_URL=http://127.0.0.1:3000
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   Open `http://127.0.0.1:3000` in your browser.

---

### 3. Backend Setup (Django YouTube Audio API)

1. Navigate to the backend directory:
   ```bash
   cd youtube-audio-api
   ```

2. Set up virtual environment & install requirements:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate

   pip install -r requirements.txt
   ```

3. Run migrations and start the Django server:
   ```bash
   python manage.py migrate
   python manage.py runserver 8000
   ```
   The backend API will run at `http://127.0.0.1:8000/`.

---

## 📦 Building for Production

To create a production build of the web client:

```bash
npm run build
```

This compiles TypeScript and outputs optimized static assets into the `build/` directory.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome! Feel free to fork the repository, open issues, or submit pull requests.

## 📝 License

This project is open-source and licensed under the [MIT License](LICENSE).
