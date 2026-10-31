/**
 * Kali Island - Native Desktop Overlay Runner
 * Provides transparent, always-on-top, top-centered window management for Kali Linux XFCE.
 */

const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// Enforce single instance lock so multiple copies aren't spawned
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Kali Island] Another instance is already running. Quitting duplicate instance.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('shortcut:toggle');
  }
});

// Ensure transparent visuals under X11 compositing and disable sandbox restrictions
app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

// Direct cache and user data into workspace
const cacheDir = path.join(__dirname, '..', '.cache', 'electron-user-data');
app.setPath('userData', cacheDir);

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  // Window bounds at top-center of display (starts in compact idle pill size)
  const winIdleWidth = 440;
  const winIdleHeight = 80;
  const posX = Math.round((screenWidth - winIdleWidth) / 2);
  const posY = 0;

  mainWindow = new BrowserWindow({
    width: winIdleWidth,
    height: winIdleHeight,
    x: posX,
    y: posY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Handle window blur (clicking outside the island collapses it)
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:blur');
    }
  });

  // Load production dist or local src
  const devUrl = 'http://localhost:5173';
  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  const srcPath = path.join(__dirname, '..', 'src', 'index.html');

  if (process.env.VITE_DEV) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(distPath).catch(() => {
      mainWindow.loadFile(srcPath);
    });
  }

  // Register Global Shortcut Super+I
  try {
    globalShortcut.register('Super+I', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:toggle');
      }
    });
  } catch (err) {
    console.warn('Super+I shortcut registration:', err);
  }

  // Also register Alt+I / Ctrl+I as fallbacks
  try {
    globalShortcut.register('Alt+I', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:toggle');
      }
    });
  } catch (err) {
    // Ignore fallback collision
  }

  // Watch for Fullscreen Windows via X11 EWMH
  initFullscreenWatcher();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Autostart Management for Kali Linux / XFCE (XDG Autostart)
 */
const autostartDesktopPath = path.join(
  process.env.HOME || os.homedir(),
  '.config',
  'autostart',
  'kali-island.desktop'
);

function getAutostartStatus() {
  try {
    if (!fs.existsSync(autostartDesktopPath)) return false;
    const content = fs.readFileSync(autostartDesktopPath, 'utf8');
    if (content.includes('X-GNOME-Autostart-enabled=false')) return false;
    return true;
  } catch (err) {
    console.error('[Kali Island] Error reading autostart desktop file:', err);
    return false;
  }
}

function setAutostartStatus(enable) {
  try {
    const autostartDir = path.dirname(autostartDesktopPath);
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true });
    }

    if (!enable) {
      if (fs.existsSync(autostartDesktopPath)) {
        fs.unlinkSync(autostartDesktopPath);
      }
      return { success: true, enabled: false };
    }

    const launcherScript = path.join(__dirname, 'start-island.sh');
    const desktopEntry = `[Desktop Entry]
Type=Application
Name=Kali Island
GenericName=Dynamic Island Desktop Overlay
Comment=Intelligent Dynamic Island desktop interface for Kali Linux
Exec=bash "${launcherScript}"
Icon=preferences-desktop
Terminal=false
Categories=Utility;
StartupNotify=false
X-GNOME-Autostart-enabled=true
X-XFCE-Autostart-enabled=true
`;

    fs.writeFileSync(autostartDesktopPath, desktopEntry, { mode: 0o644 });
    return { success: true, enabled: true };
  } catch (err) {
    console.error('[Kali Island] Error writing autostart file:', err);
    return { success: false, error: err.message };
  }
}

ipcMain.handle('autostart:get-status', () => {
  return getAutostartStatus();
});

ipcMain.handle('autostart:set-status', (_event, enabled) => {
  return setAutostartStatus(enabled);
});

/**
 * IPC Handlers for System Integration, Dragging, and App Launching
 */
ipcMain.handle('app:launch', async (_event, command) => {
  if (!command || typeof command !== 'string') return { success: false, error: 'Empty command' };

  console.log(`[Kali Island] Launching application: ${command}`);
  return new Promise((resolve) => {
    exec(command, (err) => {
      if (err) {
        console.error(`[Kali Island] Failed to launch '${command}':`, err.message);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('app:speak', async (_event, payload) => {
  const text = typeof payload === 'string' ? payload : (payload && payload.text);
  if (!text || typeof text !== 'string') return false;

  const voiceUrl = (payload && payload.voiceUrl) || 'http://localhost:8880/v1/audio/speech';
  const voiceName = (payload && payload.voiceName) || 'nova';
  const safeText = text.replace(/["`$\\]/g, ' ').substring(0, 300);

  // 1. Try local trained voice server if available
  try {
    const res = await fetch(voiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: text,
        voice: voiceName,
        model: 'tts-1'
      }),
      signal: AbortSignal.timeout(1500)
    });

    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const tempAudio = path.join(cacheDir, 'reply.wav');
      require('fs').writeFileSync(tempAudio, buffer);
      exec(`paplay "${tempAudio}" 2>/dev/null || aplay "${tempAudio}" 2>/dev/null`);
      return { success: true, engine: 'trained_voice' };
    }
  } catch (err) {
    // Trained server not reachable or offline, continue to fallback
  }

  // 2. Native Linux speech dispatcher fallback
  exec(`spd-say -r 10 "${safeText}"`, (err) => {
    if (err) console.warn('[Kali Island] spd-say note:', err.message);
  });
  return { success: true, engine: 'system_tts' };
});

ipcMain.handle('window:move', (_event, { dx, dy }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const [curX, curY] = mainWindow.getPosition();
  mainWindow.setPosition(curX + dx, curY + dy);
  return mainWindow.getPosition();
});

ipcMain.handle('window:set-position', (_event, { x, y }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  mainWindow.setPosition(Math.round(x), Math.round(y));
  return mainWindow.getPosition();
});

ipcMain.handle('window:get-position', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return [0, 0];
  return mainWindow.getPosition();
});

ipcMain.handle('window:set-size', (_event, { width, height }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  mainWindow.setSize(Math.round(width), Math.round(height));
  return mainWindow.getSize();
});

ipcMain.handle('screen:get-bounds', () => {
  const primary = screen.getPrimaryDisplay();
  return {
    workAreaSize: primary.workAreaSize,
    bounds: primary.bounds
  };
});

let currentIslandStatus = 'idle';
let collapseTimeout = null;

// Dynamically shrink/expand the physical OS window so the idle pill NEVER blocks background clicks
ipcMain.on('island:state-changed', (_event, status) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (status === currentIslandStatus) return;
  currentIslandStatus = status;

  if (collapseTimeout) {
    clearTimeout(collapseTimeout);
    collapseTimeout = null;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const screenWidth = primaryDisplay.workAreaSize.width;
  const [curX, curY] = mainWindow.getPosition();
  const [curW] = mainWindow.getSize();
  const centerX = curX + Math.round(curW / 2);

  if (status === 'expanded') {
    // Expand window bounds immediately to fit expanded panel
    const expW = 860;
    const expH = 600;
    let targetX = Math.round(centerX - expW / 2);
    if (targetX < 10) targetX = 10;
    if (targetX + expW > screenWidth - 10) targetX = screenWidth - expW - 10;

    mainWindow.setBounds({
      x: targetX,
      y: curY,
      width: expW,
      height: expH
    });
  } else {
    // Wait for the spring collapse animation to finish, then shrink OS window bounds to 440x80!
    collapseTimeout = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (currentIslandStatus === 'expanded') return;

      const idleW = 440;
      const idleH = 80;
      let targetX = Math.round(centerX - idleW / 2);
      if (targetX < 10) targetX = 10;
      if (targetX + idleW > screenWidth - 10) targetX = screenWidth - idleW - 10;

      mainWindow.setBounds({
        x: targetX,
        y: curY,
        width: idleW,
        height: idleH
      });
    }, 320);
  }
});

ipcMain.on('window:set-ignore-mouse-events', (_event, { ignore, options }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(ignore, options);
  }
});

/**
 * Periodically polls X11 active window to check if it has _NET_WM_STATE_FULLSCREEN
 */
function initFullscreenWatcher() {
  let wasFullscreen = false;

  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    exec('xprop -root _NET_ACTIVE_WINDOW', (err, stdout) => {
      if (err || !stdout) return;
      const match = stdout.match(/_NET_ACTIVE_WINDOW\(WINDOW\): window id # (0x[0-9a-fA-F]+)/);
      if (!match || !match[1]) return;

      const windowId = match[1];
      exec(`xprop -id ${windowId} _NET_WM_STATE`, (errState, stdoutState) => {
        if (errState || !stdoutState) return;
        const isFullscreen = stdoutState.includes('_NET_WM_STATE_FULLSCREEN');
        if (isFullscreen !== wasFullscreen) {
          wasFullscreen = isFullscreen;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('fullscreen:changed', isFullscreen);
          }
        }
      });
    });
  }, 1500);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
