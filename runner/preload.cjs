/**
 * Kali Island - Preload IPC Bridge
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('islandDesktopAPI', {
  // Application Launching & Voice
  launchApp: (command) => ipcRenderer.invoke('app:launch', command),
  speak: (payload) => ipcRenderer.invoke('app:speak', payload),

  // Autostart configuration
  getAutostartStatus: () => ipcRenderer.invoke('autostart:get-status'),
  setAutostartStatus: (enabled) => ipcRenderer.invoke('autostart:set-status', enabled),

  // Window Manipulation & Dragging
  moveWindow: (dx, dy) => ipcRenderer.invoke('window:move', { dx, dy }),
  setPosition: (x, y) => ipcRenderer.invoke('window:set-position', { x, y }),
  getPosition: () => ipcRenderer.invoke('window:get-position'),
  setSize: (width, height) => ipcRenderer.invoke('window:set-size', { width, height }),
  getScreenBounds: () => ipcRenderer.invoke('screen:get-bounds'),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('window:set-ignore-mouse-events', { ignore, options }),

  // Event Listeners
  onShortcutToggle: (callback) => {
    ipcRenderer.on('shortcut:toggle', () => callback());
  },
  onFullscreenChanged: (callback) => {
    ipcRenderer.on('fullscreen:changed', (_event, isFullscreen) => callback(isFullscreen));
  },
  onWindowBlur: (callback) => {
    ipcRenderer.on('window:blur', () => callback());
  },
  onIslandStateChanged: (status) => {
    ipcRenderer.send('island:state-changed', status);
  }
});
