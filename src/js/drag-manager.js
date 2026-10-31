/**
 * Kali Island - Window Dragging & Position Anchor Manager
 */

export class DragManager {
  constructor(state, capsuleEl) {
    this.state = state;
    this.capsule = capsuleEl;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.bind();
  }

  bind() {
    // Listen for drag initiates on drag handles
    document.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;

      // Only allow drag if desktop API is available
      if (!window.islandDesktopAPI || !window.islandDesktopAPI.moveWindow) return;

      this.isDragging = true;
      this.startX = e.screenX;
      this.startY = e.screenY;

      document.body.style.cursor = 'grabbing';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const dx = e.screenX - this.startX;
      const dy = e.screenY - this.startY;

      if (dx !== 0 || dy !== 0) {
        window.islandDesktopAPI.moveWindow(dx, dy);
        this.startX = e.screenX;
        this.startY = e.screenY;
      }
    });

    const stopDrag = () => {
      if (this.isDragging) {
        this.isDragging = false;
        document.body.style.cursor = 'default';
        if (window.islandDesktopAPI && window.islandDesktopAPI.getPosition) {
          window.islandDesktopAPI.getPosition().then(pos => {
            if (pos) {
              this.state.updateSettings({ windowPosition: { x: pos[0], y: pos[1] } });
            }
          });
        }
      }
    };

    document.addEventListener('mouseup', stopDrag);
    window.addEventListener('blur', stopDrag);
  }

  async setAnchor(preset) {
    if (!window.islandDesktopAPI || !window.islandDesktopAPI.setPosition || !window.islandDesktopAPI.getScreenBounds) {
      console.warn('Desktop API not available for anchor positioning');
      return;
    }

    try {
      const { workAreaSize } = await window.islandDesktopAPI.getScreenBounds();
      const screenW = workAreaSize.width || 3840;
      const isExpanded = this.state.status === 'expanded';
      const winW = isExpanded ? 860 : 440;
      const winH = isExpanded ? 600 : 80;

      let x = Math.round((screenW - winW) / 2);
      let y = 0;

      switch (preset) {
        case 'top-center':
          x = Math.round((screenW - winW) / 2);
          y = 0;
          break;
        case 'top-left':
          x = 24;
          y = 0;
          break;
        case 'top-right':
          x = screenW - winW - 24;
          y = 0;
          break;
        case 'bottom-center':
          x = Math.round((screenW - winW) / 2);
          y = screenH - winH - 20;
          break;
      }

      await window.islandDesktopAPI.setPosition(x, y);
      this.state.updateSettings({ anchor: preset, windowPosition: { x, y } });
      console.log(`[Kali Island] Position anchored to: ${preset} (${x}, ${y})`);
    } catch (err) {
      console.error('Failed to set anchor:', err);
    }
  }
}
