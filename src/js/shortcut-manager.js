/**
 * Kali Island - Shortcut & Interaction Manager
 */

export class ShortcutManager {
  constructor(state, animator, capsuleEl, viewportEl) {
    this.state = state;
    this.animator = animator;
    this.capsule = capsuleEl;
    this.viewport = viewportEl;

    this.bindEvents();
  }

  bindEvents() {
    // Global keyboard shortcuts
    if (window.islandDesktopAPI && window.islandDesktopAPI.onShortcutToggle) {
      window.islandDesktopAPI.onShortcutToggle(() => {
        this.toggle();
      });
    }

    // Auto-collapse when clicking outside anywhere on the desktop (window blur)
    if (window.islandDesktopAPI && window.islandDesktopAPI.onWindowBlur) {
      window.islandDesktopAPI.onWindowBlur(() => {
        if (this.state.settings && this.state.settings.collapseOnBlur && this.state.status === 'expanded') {
          this.state.setStatus('idle');
          this.animator.collapse();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      // Escape collapses
      if (e.key === 'Escape') {
        if (this.state.status === 'expanded') {
          this.state.setStatus('idle');
          this.animator.collapse();
        }
      }

      // Super+I or Ctrl+I toggles expanded island
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        this.toggle();
      }

      // Tab switcher shortcuts when expanded
      if (this.state.status === 'expanded') {
        if (e.key === '1') this.state.setTab('overview');
        if (e.key === '2') this.state.setTab('gpu');
        if (e.key === '3') this.state.setTab('actions');
        if (e.key === '4') this.state.setTab('media');
        if (e.key === '5') this.state.setTab('settings');
        if (e.key.toLowerCase() === 't') this.state.cycleTheme();
      }
    });

    // Outside click collapses the island
    this.viewport.addEventListener('click', (e) => {
      if (!this.capsule.contains(e.target) && this.state.status === 'expanded') {
        this.state.setStatus('idle');
        this.animator.collapse();
      }
    });

    // Capsule click toggles when idle
    this.capsule.addEventListener('click', (e) => {
      // If clicking inside interactive elements like buttons, don't toggle
      if (e.target.closest('button') || e.target.closest('.action-pill')) {
        return;
      }
      
      if (this.state.status === 'idle' || this.state.status === 'hover') {
        this.state.setStatus('expanded');
        this.animator.expand();
      }
    });

    // Hover detection for idle state
    this.capsule.addEventListener('mouseenter', () => {
      if (this.state.status === 'idle') {
        this.state.setStatus('hover');
      }
    });

    this.capsule.addEventListener('mouseleave', () => {
      if (this.state.status === 'hover') {
        this.state.setStatus('idle');
      }
    });
  }

  toggle() {
    if (this.state.status === 'expanded') {
      this.state.setStatus('idle');
      this.animator.collapse();
    } else {
      this.state.setStatus('expanded');
      this.animator.expand();
    }
  }
}
