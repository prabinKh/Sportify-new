#!/usr/bin/env bash
# ============================================================
# 🎵 Sportify — LAN Jam Session Launcher
# ============================================================
# Run this script on the HOST laptop.
# It auto-detects your local WiFi IP, updates .env,
# then starts both the Django backend and Vite frontend
# so everyone on the same WiFi can join.
#
# Usage:
#   chmod +x start_lan.sh
#   ./start_lan.sh
#
# Friends just open the printed URL in their phone/laptop browser.
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
BACKEND_DIR="$SCRIPT_DIR/youtube-audio-api"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# ── 1. Detect local WiFi IP ──────────────────────────────────────────────────
detect_lan_ip() {
  # macOS: try Wi-Fi (en0), then Ethernet (en1)
  for iface in en0 en1 en2 eth0 wlan0; do
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null)
    if [[ -n "$ip" && "$ip" != "127.0.0.1" ]]; then
      echo "$ip"
      return
    fi
  done
  # Linux fallback
  hostname -I 2>/dev/null | awk '{print $1}'
}

LAN_IP=$(detect_lan_ip)

if [[ -z "$LAN_IP" ]]; then
  echo "❌  Could not detect local WiFi IP."
  echo "    Make sure you are connected to WiFi and try again."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          🎵 Sportify LAN Jam Session                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "📡  Detected LAN IP:  $LAN_IP"
echo ""

# ── 2. Update .env with current LAN IP ──────────────────────────────────────
update_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # Replace existing line (macOS-compatible sed)
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    # Add missing key
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

echo "📝  Updating .env → LOCAL_IP, VITE_LOCAL_IP, VITE_API_BASE_URL, VITE_SPOTIFY_REDIRECT_URL"
update_env "LOCAL_IP"                    "$LAN_IP"
update_env "VITE_LOCAL_IP"               "$LAN_IP"
update_env "VITE_API_BASE_URL"           "http://${LAN_IP}:${BACKEND_PORT}"
update_env "VITE_SPOTIFY_REDIRECT_URL"   "http://${LAN_IP}:${FRONTEND_PORT}"

echo ""
echo "✅  .env updated successfully."
echo ""
echo "┌──────────────────────────────────────────────────────┐"
echo "│  Share these URLs with your friends on the same WiFi │"
echo "├──────────────────────────────────────────────────────┤"
printf  "│  🌐  App:     http://%-31s│\n" "${LAN_IP}:${FRONTEND_PORT}"
printf  "│  🔌  API:     http://%-31s│\n" "${LAN_IP}:${BACKEND_PORT}"
echo "└──────────────────────────────────────────────────────┘"
echo ""

# ── 3. Show QR code for the App URL (if qrencode is installed) ───────────────
APP_URL="http://${LAN_IP}:${FRONTEND_PORT}"
if command -v qrencode &>/dev/null; then
  echo "📱  Scan this QR code to open on your phone:"
  echo ""
  qrencode -t ANSIUTF8 "$APP_URL"
  echo ""
elif command -v python3 &>/dev/null; then
  echo "📱  Phone QR code (copy this URL):"
  echo "    $APP_URL"
  echo ""
  echo "💡  Tip: Install qrencode for a scannable QR code:"
  echo "    brew install qrencode"
  echo ""
else
  echo "📱  Open this on your phone: $APP_URL"
  echo ""
fi

# ── 4. Start Django backend ───────────────────────────────────────────────────
echo "🚀  Starting Django backend on 0.0.0.0:${BACKEND_PORT} ..."
cd "$BACKEND_DIR"
source venv/bin/activate 2>/dev/null || true

# Use Daphne (ASGI) if available, fall back to manage.py runserver
if python -c "import daphne" 2>/dev/null; then
  python -m daphne -b 0.0.0.0 -p "$BACKEND_PORT" ytaudio.asgi:application &
  BACKEND_PID=$!
  echo "   ✅  Daphne started (WebSocket + HTTP) — PID $BACKEND_PID"
else
  python manage.py runserver "0.0.0.0:${BACKEND_PORT}" &
  BACKEND_PID=$!
  echo "   ✅  Django dev server started — PID $BACKEND_PID"
fi

sleep 1

# ── 5. Start Vite frontend ────────────────────────────────────────────────────
echo ""
echo "🚀  Starting Vite frontend on ${LAN_IP}:${FRONTEND_PORT} ..."
cd "$SCRIPT_DIR"
npm run dev -- --host "$LAN_IP" --port "$FRONTEND_PORT" &
FRONTEND_PID=$!
echo "   ✅  Vite started — PID $FRONTEND_PID"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Sportify LAN Session is LIVE!                   ║"
echo "║                                                      ║"
printf "║  📱  Friends open:  http://%-24s║\n" "${LAN_IP}:${FRONTEND_PORT}"
echo "║                                                      ║"
echo "║  Press Ctrl+C to stop both servers.                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 6. Wait & clean up on Ctrl+C ─────────────────────────────────────────────
cleanup() {
  echo ""
  echo "🛑  Stopping Sportify LAN session..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  echo "✅  All servers stopped. Session ended."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait "$BACKEND_PID" "$FRONTEND_PID"
