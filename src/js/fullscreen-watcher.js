/**
 * Kali Island - Fullscreen Detection Watcher
 * Detects when windows enter fullscreen mode to hide/minimize the island automatically.
 */

export class FullscreenWatcher {
  constructor(state, animator) {
    this.state = state;
    this.animator = animator;
    this.isFullscreen = false;

    this.bind();
  }

  bind() {
    // HTML5 Fullscreen change listener
    document.addEventListener('fullscreenchange', () => {
      this.handleFullscreen(!!document.fullscreenElement);
    });

    // Desktop IPC listener (for Tauri / Electron)
    if (window.islandDesktopAPI && window.islandDesktopAPI.onFullscreenChanged) {
      window.islandDesktopAPI.onFullscreenChanged((isFullscreen) => {
        this.handleFullscreen(isFullscreen);
      });
    }
  }

  handleFullscreen(fullscreenActive) {
    this.isFullscreen = fullscreenActive;
    if (this.isFullscreen) {
      this.state.setStatus('minimized');
      this.animator.minimize();
    } else {
      if (this.state.status === 'minimized') {
        this.state.setStatus('idle');
        this.animator.restore();
      }
    }
  }
}
