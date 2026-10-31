/**
 * Kali Island - Reactive State Manager with Persistence
 */

class IslandState {
  constructor() {
    this.status = 'idle'; // 'idle' | 'hover' | 'expanded' | 'minimized'
    this.activeTab = 'overview'; // 'overview' | 'gpu' | 'media' | 'actions' | 'settings'
    this.theme = localStorage.getItem('kali_island_theme') || 'dark';
    this.listeners = new Set();
    
    // Default Quick Actions
    const defaultActions = [
      { id: 'act-term', name: 'Terminal', icon: '⚡', command: 'x-terminal-emulator' },
      { id: 'act-files', name: 'Files', icon: '📁', command: 'thunar' },
      { id: 'act-web', name: 'Firefox', icon: '🌐', command: 'firefox' },
      { id: 'act-docker', name: 'Docker UI', icon: '🐳', command: 'x-terminal-emulator -e "docker ps; bash"' },
      { id: 'act-ai', name: 'AI Chat', icon: '🤖', command: 'x-terminal-emulator -e "ollama run qwen:latest; bash"' },
      { id: 'act-sec', name: 'Network Scan', icon: '🛡️', command: 'x-terminal-emulator -e "ip addr; ss -tulpn; bash"' }
    ];

    // Default Media Launchers
    const defaultMedia = [
      { id: 'med-spot', name: 'Spotify Web', icon: '🟢', command: 'firefox https://open.spotify.com' },
      { id: 'med-yt', name: 'YouTube Music', icon: '🔴', command: 'firefox https://music.youtube.com' },
      { id: 'med-mixer', name: 'Audio Mixer', icon: '🎚️', command: 'x-terminal-emulator -e alsamixer' },
      { id: 'med-lofi', name: 'Lofi Chill', icon: '🎧', command: 'firefox https://www.youtube.com/watch?v=jfKfPfyJRdk' }
    ];

    // Load persisted actions or use defaults
    try {
      const savedActions = localStorage.getItem('kali_island_actions');
      this.quickActions = savedActions ? JSON.parse(savedActions) : defaultActions;
    } catch {
      this.quickActions = defaultActions;
    }

    try {
      const savedMedia = localStorage.getItem('kali_island_media');
      this.mediaList = savedMedia ? JSON.parse(savedMedia) : defaultMedia;
    } catch {
      this.mediaList = defaultMedia;
    }

    // Default Settings
    const defaultSettings = {
      scale: 1.0,
      blur: 28,
      opacity: 0.85,
      collapseOnBlur: true,
      freeDrag: true,
      anchor: 'top-center',
      autostart: true,
      voiceUrl: 'http://localhost:8880/v1/audio/speech',
      voiceName: 'nova',
      voiceEngine: 'trained'
    };

    try {
      const savedSettings = localStorage.getItem('kali_island_settings');
      this.settings = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    } catch {
      this.settings = defaultSettings;
    }

    // Telemetry state
    this.telemetry = {
      cpu: 18,
      ram: 42,
      ramUsed: '6.7 GB',
      ramTotal: '16.0 GB',
      gpu: 6,
      gpuTemp: 44,
      vramUsed: '1.8 GB',
      vramTotal: '12.0 GB',
      disk: 34,
      netSpeed: '1.2 MB/s'
    };

    this.initClock();
    this.initTelemetrySimulation();
    this.applySettings();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event) {
    this.listeners.forEach(fn => fn(event, this));
  }

  setStatus(newStatus) {
    if (this.status === newStatus) return;
    const oldStatus = this.status;
    this.status = newStatus;
    this.notify({ type: 'status_change', oldStatus, newStatus });
  }

  setTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.notify({ type: 'tab_change', tab });
  }

  cycleTheme() {
    const themes = ['dark', 'oled', 'cyber', 'light'];
    const nextIdx = (themes.indexOf(this.theme) + 1) % themes.length;
    this.theme = themes[nextIdx];
    localStorage.setItem('kali_island_theme', this.theme);
    document.documentElement.setAttribute('data-theme', this.theme);
    this.notify({ type: 'theme_change', theme: this.theme });
  }

  setTheme(themeName) {
    this.theme = themeName;
    localStorage.setItem('kali_island_theme', this.theme);
    document.documentElement.setAttribute('data-theme', this.theme);
    this.notify({ type: 'theme_change', theme: this.theme });
  }

  updateSettings(partial) {
    this.settings = { ...this.settings, ...partial };
    localStorage.setItem('kali_island_settings', JSON.stringify(this.settings));
    this.applySettings();
    this.notify({ type: 'settings_update', settings: this.settings });
  }

  applySettings() {
    document.documentElement.style.setProperty('--user-scale', this.settings.scale);
    document.documentElement.style.setProperty('--glass-blur', `blur(${this.settings.blur}px)`);
    document.documentElement.style.setProperty('--glass-opacity', this.settings.opacity);
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  // Quick Action Management
  addQuickAction(name, icon, command) {
    const newAction = {
      id: `act-${Date.now()}`,
      name: name.trim() || 'Custom Action',
      icon: icon.trim() || '⚡',
      command: command.trim()
    };
    this.quickActions.push(newAction);
    localStorage.setItem('kali_island_actions', JSON.stringify(this.quickActions));
    this.notify({ type: 'actions_updated', actions: this.quickActions });
  }

  removeQuickAction(id) {
    this.quickActions = this.quickActions.filter(a => a.id !== id);
    localStorage.setItem('kali_island_actions', JSON.stringify(this.quickActions));
    this.notify({ type: 'actions_updated', actions: this.quickActions });
  }

  // Media Management
  addMediaItem(name, icon, command) {
    const newItem = {
      id: `med-${Date.now()}`,
      name: name.trim() || 'Media Player',
      icon: icon.trim() || '🎵',
      command: command.trim()
    };
    this.mediaList.push(newItem);
    localStorage.setItem('kali_island_media', JSON.stringify(this.mediaList));
    this.notify({ type: 'media_updated', media: this.mediaList });
  }

  removeMediaItem(id) {
    this.mediaList = this.mediaList.filter(m => m.id !== id);
    localStorage.setItem('kali_island_media', JSON.stringify(this.mediaList));
    this.notify({ type: 'media_updated', media: this.mediaList });
  }

  initClock() {
    const updateTime = () => {
      const now = new Date();
      this.timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.notify({ type: 'clock_tick', time: this.timeStr });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  initTelemetrySimulation() {
    setInterval(() => {
      this.telemetry.cpu = Math.min(95, Math.max(8, Math.round(this.telemetry.cpu + (Math.random() * 8 - 4))));
      this.telemetry.gpu = Math.min(98, Math.max(3, Math.round(this.telemetry.gpu + (Math.random() * 6 - 3))));
      this.notify({ type: 'telemetry_update', telemetry: this.telemetry });
    }, 2000);
  }
}

export const islandState = new IslandState();
