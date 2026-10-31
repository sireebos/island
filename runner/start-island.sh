#!/usr/bin/env bash
# ==============================================================================
# Kali Island - Desktop Autostart Launcher
# Automatically initializes and launches Kali Island on PC boot / desktop login
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_DIR/.cache/island-autostart.log"

mkdir -p "$PROJECT_DIR/.cache"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

log "Autostart triggered for Kali Island"

# Ensure DISPLAY and XAUTHORITY are properly set for X11 session
export DISPLAY="${DISPLAY:-:0.0}"

# Wait up to 30 seconds for X11 display server to respond
for i in {1..30}; do
  if xset q >/dev/null 2>&1; then
    log "X11 Display ($DISPLAY) detected ready on iteration $i."
    break
  fi
  sleep 1
done

# Grace delay to ensure XFCE window manager and compositor (xfwm4/picom)
# have fully stabilized their compositing pipelines for transparent windows
sleep 2

cd "$PROJECT_DIR" || exit 1

# Check if production build exists; if not, build it quickly
if [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
  log "Dist index.html not found, generating production bundle..."
  npm run build >> "$LOG_FILE" 2>&1
fi

ELECTRON_BIN="$PROJECT_DIR/node_modules/.bin/electron"

if [ -x "$ELECTRON_BIN" ]; then
  log "Launching Kali Island via local Electron binary ($ELECTRON_BIN)..."
  exec "$ELECTRON_BIN" --no-sandbox "$SCRIPT_DIR/main.cjs" >> "$LOG_FILE" 2>&1
elif command -v electron >/dev/null 2>&1; then
  log "Launching Kali Island via system Electron..."
  exec electron --no-sandbox "$SCRIPT_DIR/main.cjs" >> "$LOG_FILE" 2>&1
else
  log "Launching Kali Island via npm run start:desktop..."
  exec npm run start:desktop >> "$LOG_FILE" 2>&1
fi
