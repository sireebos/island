/**
 * Kali Island - Main Application Coordinator
 */

import { islandState } from './state.js';
import { SpringAnimator } from './spring.js';
import { ShortcutManager } from './shortcut-manager.js';
import { FullscreenWatcher } from './fullscreen-watcher.js';
import { DragManager } from './drag-manager.js';
import { VoiceAssistant } from './voice-assistant.js';

document.addEventListener('DOMContentLoaded', () => {
  const capsuleEl = document.getElementById('island-capsule');
  const viewportEl = document.getElementById('island-viewport');
  const clockEl = document.getElementById('idle-clock');
  const ipTagEl = document.getElementById('idle-ip-tag');

  // Detect local IP via WebRTC and display in the idle tag
  function detectAndShowLocalIP() {
    if (!ipTagEl) return;
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(o => pc.setLocalDescription(o));
      const found = new Set();
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          // gathering done — pick best result
          pc.close();
          const ips = [...found].filter(ip =>
            /^\d+\.\d+\.\d+\.\d+$/.test(ip) && !ip.startsWith('127.')
          );
          if (ips.length > 0) {
            ipTagEl.textContent = ips[0];
            ipTagEl.title = `Local IP: ${ips.join(', ')}`;
          } else {
            ipTagEl.textContent = 'No IP';
          }
          return;
        }
        const parts = ice.candidate.candidate.split(' ');
        if (parts[7] === 'host') found.add(parts[4]);
      };
      // Fallback timeout in case ICE never fires null candidate
      setTimeout(() => {
        if (ipTagEl.textContent === '...') ipTagEl.textContent = 'No IP';
        try { pc.close(); } catch (_) {}
      }, 3000);
    } catch (err) {
      if (ipTagEl) ipTagEl.textContent = 'No IP';
    }
  }

  detectAndShowLocalIP();
  const themeBtn = document.getElementById('theme-toggle-btn');
  const headerSettingsBtn = document.getElementById('header-settings-btn');
  const closeBtn = document.getElementById('close-island-btn');
  const tabs = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Telemetry elements
  const cpuValEl = document.getElementById('stat-cpu-val');
  const cpuBarEl = document.getElementById('stat-cpu-bar');
  const ramValEl = document.getElementById('stat-ram-val');
  const ramBarEl = document.getElementById('stat-ram-bar');
  const gpuValEl = document.getElementById('stat-gpu-val');
  const gpuBarEl = document.getElementById('stat-gpu-bar');
  const gpuTempEl = document.getElementById('stat-gpu-temp');
  const vramValEl = document.getElementById('stat-vram-val');

  // Dynamic grids
  const quickActionsGrid = document.getElementById('quick-actions-grid');
  const mediaLaunchersGrid = document.getElementById('media-launchers-grid');
  const addActionBtn = document.getElementById('add-action-btn');
  const addMediaBtn = document.getElementById('add-media-btn');

  // Modal elements
  const itemModal = document.getElementById('item-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalName = document.getElementById('modal-input-name');
  const modalIcon = document.getElementById('modal-input-icon');
  const modalCmd = document.getElementById('modal-input-cmd');
  const modalSaveBtn = document.getElementById('modal-save-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  let currentModalType = 'action'; // 'action' | 'media'

  // Settings elements
  const scaleSlider = document.getElementById('setting-scale-slider');
  const scaleVal = document.getElementById('setting-scale-val');
  const blurSlider = document.getElementById('setting-blur-slider');
  const blurVal = document.getElementById('setting-blur-val');
  const resetSizeBtn = document.getElementById('reset-size-btn');
  const fontSlider = document.getElementById('setting-font-slider');
  const fontVal = document.getElementById('setting-font-val');
  const toggleBlurCollapse = document.getElementById('toggle-blur-collapse');
  const toggleAutostart = document.getElementById('toggle-autostart');
  const anchorBtns = document.querySelectorAll('.anchor-btn[data-anchor]');
  const themeSetBtns = document.querySelectorAll('.anchor-btn[data-theme-set]');

  // Initialize subsystems
  const animator = new SpringAnimator(capsuleEl);
  const shortcuts = new ShortcutManager(islandState, animator, capsuleEl, viewportEl);
  const fullscreenWatcher = new FullscreenWatcher(islandState, animator);
  const dragManager = new DragManager(islandState, capsuleEl);
  const voiceAssistant = new VoiceAssistant(islandState, animator);

  // Initial sync with settings
  if (scaleSlider && scaleVal) {
    const scalePct = Math.round((islandState.settings.scale || 1.0) * 100);
    scaleSlider.value = scalePct;
    scaleVal.textContent = `${scalePct}%`;
  }
  if (blurSlider && blurVal) {
    blurSlider.value = islandState.settings.blur || 28;
    blurVal.textContent = `${blurSlider.value}px`;
  }
  if (toggleBlurCollapse) {
    toggleBlurCollapse.checked = !!islandState.settings.collapseOnBlur;
  }
  if (toggleAutostart) {
    if (window.islandDesktopAPI && window.islandDesktopAPI.getAutostartStatus) {
      window.islandDesktopAPI.getAutostartStatus().then(status => {
        toggleAutostart.checked = !!status;
      }).catch(() => {
        toggleAutostart.checked = islandState.settings.autostart !== false;
      });
    } else {
      toggleAutostart.checked = islandState.settings.autostart !== false;
    }
  }
  // Sync font scale slider with persisted value
  const savedFontScale = parseFloat(localStorage.getItem('kali_island_font_scale') || '1.0');
  document.documentElement.style.setProperty('--user-font-scale', savedFontScale);
  if (fontSlider && fontVal) {
    fontSlider.value = Math.round(savedFontScale * 100);
    fontVal.textContent = `${fontSlider.value}%`;
  }


  function renderQuickActions() {
    if (!quickActionsGrid) return;
    quickActionsGrid.innerHTML = '';

    islandState.quickActions.forEach(action => {
      const card = document.createElement('div');
      card.className = 'action-card';
      card.title = `Execute: ${action.command}`;
      card.innerHTML = `
        <button class="action-delete-btn" title="Remove action" data-id="${action.id}">×</button>
        <div class="action-icon-box">
          <span class="action-icon">${action.icon}</span>
        </div>
        <span class="action-label">${action.name}</span>
        <span class="action-cmd-preview">${action.command}</span>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.action-delete-btn')) {
          e.stopPropagation();
          islandState.removeQuickAction(action.id);
          return;
        }

        // Launch app
        executeApp(action.command, action.name, card);
      });

      quickActionsGrid.appendChild(card);
    });
  }

  function renderMediaLaunchers() {
    if (!mediaLaunchersGrid) return;
    mediaLaunchersGrid.innerHTML = '';

    islandState.mediaList.forEach(media => {
      const card = document.createElement('div');
      card.className = 'action-card';
      card.title = `Launch Media: ${media.command}`;
      card.innerHTML = `
        <button class="action-delete-btn" title="Remove media launcher" data-id="${media.id}">×</button>
        <div class="action-icon-box">
          <span class="action-icon">${media.icon}</span>
        </div>
        <span class="action-label">${media.name}</span>
        <span class="action-cmd-preview">${media.command}</span>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.action-delete-btn')) {
          e.stopPropagation();
          islandState.removeMediaItem(media.id);
          return;
        }

        executeApp(media.command, media.name, card);
      });

      mediaLaunchersGrid.appendChild(card);
    });
  }

  // Mouse wheel horizontal scroll on action strips
  [quickActionsGrid, mediaLaunchersGrid].forEach(grid => {
    if (!grid) return;
    grid.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        grid.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  });

  function executeApp(command, label, element) {
    if (element) {
      element.style.transform = 'scale(0.94)';
      setTimeout(() => element.style.transform = '', 180);
    }

    if (window.islandDesktopAPI && window.islandDesktopAPI.launchApp) {
      console.log(`[Kali Island] Launching application: ${label} -> ${command}`);
      window.islandDesktopAPI.launchApp(command).then(res => {
        if (!res.success) {
          console.warn(`[Kali Island] Launch warning for ${label}:`, res.error);
        }
      });
    } else {
      console.log(`[Kali Island (Mock Browser)] Launched: ${label} (${command})`);
    }
  }

  // Initial renders
  renderQuickActions();
  renderMediaLaunchers();

  // State Subscriptions
  islandState.subscribe((event, state) => {
    if (event.type === 'status_change') {
      if (window.islandDesktopAPI && window.islandDesktopAPI.onIslandStateChanged) {
        window.islandDesktopAPI.onIslandStateChanged(event.newStatus);
      }
    }

    if (event.type === 'clock_tick') {
      if (clockEl) clockEl.textContent = event.time;
    }

    if (event.type === 'telemetry_update') {
      const tel = event.telemetry;
      if (cpuValEl) cpuValEl.textContent = `${tel.cpu}%`;
      if (cpuBarEl) cpuBarEl.style.width = `${tel.cpu}%`;
      if (ramValEl) ramValEl.textContent = `${tel.ram}%`;
      if (ramBarEl) ramBarEl.style.width = `${tel.ram}%`;
      if (gpuValEl) gpuValEl.textContent = `${tel.gpu}%`;
      if (gpuBarEl) gpuBarEl.style.width = `${tel.gpu}%`;
      if (gpuTempEl) gpuTempEl.textContent = `${tel.gpuTemp}°C`;
      if (vramValEl) vramValEl.textContent = tel.vramUsed;
    }

    if (event.type === 'tab_change') {
      tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === event.tab);
      });
      tabPanels.forEach(panel => {
        panel.style.display = panel.id === `panel-${event.tab}` ? (panel.classList.contains('telemetry-grid') ? 'grid' : 'flex') : 'none';
      });
    }

    if (event.type === 'actions_updated') {
      renderQuickActions();
    }

    if (event.type === 'media_updated') {
      renderMediaLaunchers();
    }

    if (event.type === 'theme_change') {
      if (themeBtn) themeBtn.title = `Theme: ${event.theme}`;
      themeSetBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeSet === event.theme);
      });
    }
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      islandState.setTab(tab.dataset.tab);
    });
  });

  // Header settings button
  if (headerSettingsBtn) {
    headerSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      islandState.setTab('settings');
    });
  }

  // Theme toggle button click
  if (themeBtn) {
    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      islandState.cycleTheme();
    });
  }

  // Close / Collapse button click
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      islandState.setStatus('idle');
      animator.collapse();
    });
  }

  // Modal Interactions
  function openAddModal(type) {
    currentModalType = type;
    modalTitle.textContent = type === 'action' ? 'Add Quick Action' : 'Add Media Launcher';
    modalName.value = '';
    modalName.placeholder = type === 'action' ? 'e.g. Wireshark, VS Code, Htop' : 'e.g. VLC, SoundCloud';
    modalIcon.value = type === 'action' ? '⚡' : '🎵';
    modalCmd.value = '';
    modalCmd.placeholder = type === 'action' ? 'e.g. wireshark, x-terminal-emulator -e htop' : 'e.g. firefox https://soundcloud.com';
    itemModal.style.display = 'flex';
    modalName.focus();
  }

  if (addActionBtn) {
    addActionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAddModal('action');
    });
  }

  if (addMediaBtn) {
    addMediaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAddModal('media');
    });
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      itemModal.style.display = 'none';
    });
  }

  if (modalSaveBtn) {
    modalSaveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = modalName.value.trim();
      const icon = modalIcon.value.trim() || (currentModalType === 'action' ? '⚡' : '🎵');
      const cmd = modalCmd.value.trim();

      if (!name || !cmd) {
        alert('Please provide both a Name and a Shell Command.');
        return;
      }

      if (currentModalType === 'action') {
        islandState.addQuickAction(name, icon, cmd);
      } else {
        islandState.addMediaItem(name, icon, cmd);
      }

      itemModal.style.display = 'none';
    });
  }

  // Settings Sliders & Controls
  if (scaleSlider && scaleVal) {
    scaleSlider.addEventListener('input', (e) => {
      const scalePct = parseInt(e.target.value, 10);
      scaleVal.textContent = `${scalePct}%`;
      const scaleFactor = scalePct / 100;
      islandState.updateSettings({ scale: scaleFactor });

      // Dynamically adjust window size if scale increases
      if (window.islandDesktopAPI && window.islandDesktopAPI.setSize) {
        const baseW = 840;
        const baseH = 580;
        window.islandDesktopAPI.setSize(Math.round(baseW * Math.max(1, scaleFactor)), Math.round(baseH * Math.max(1, scaleFactor)));
      }
    });
  }

  if (blurSlider && blurVal) {
    blurSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      blurVal.textContent = `${val}px`;
      islandState.updateSettings({ blur: val });
    });
  }

  if (fontSlider && fontVal) {
    fontSlider.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10);
      fontVal.textContent = `${pct}%`;
      const scale = pct / 100;
      document.documentElement.style.setProperty('--user-font-scale', scale);
      localStorage.setItem('kali_island_font_scale', scale);
    });
  }

  if (resetSizeBtn) {
    resetSizeBtn.addEventListener('click', () => {
      if (scaleSlider && scaleVal) {
        scaleSlider.value = 100;
        scaleVal.textContent = '100%';
      }
      if (fontSlider && fontVal) {
        fontSlider.value = 100;
        fontVal.textContent = '100%';
        document.documentElement.style.setProperty('--user-font-scale', 1.0);
        localStorage.setItem('kali_island_font_scale', '1.0');
      }
      islandState.updateSettings({ scale: 1.0 });
      if (window.islandDesktopAPI && window.islandDesktopAPI.setSize) {
        window.islandDesktopAPI.setSize(840, 580);
      }
    });
  }

  if (toggleBlurCollapse) {
    toggleBlurCollapse.addEventListener('change', (e) => {
      islandState.updateSettings({ collapseOnBlur: e.target.checked });
    });
  }

  if (toggleAutostart) {
    toggleAutostart.addEventListener('change', async (e) => {
      const isEnabled = e.target.checked;
      islandState.updateSettings({ autostart: isEnabled });
      if (window.islandDesktopAPI && window.islandDesktopAPI.setAutostartStatus) {
        await window.islandDesktopAPI.setAutostartStatus(isEnabled);
      }
    });
  }

  anchorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      anchorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dragManager.setAnchor(btn.dataset.anchor);
    });
  });

  themeSetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      islandState.setTheme(btn.dataset.themeSet);
    });
  });

  // Voice Assistant UI & Controls
  const idleMicBtn = document.getElementById('idle-mic-btn');
  const headerMicBtn = document.getElementById('header-mic-btn');
  const closeVoiceCardBtn = document.getElementById('close-voice-card-btn');
  const voiceChips = document.querySelectorAll('.voice-chip');
  const settingVoiceUrl = document.getElementById('setting-voice-url');
  const settingVoiceName = document.getElementById('setting-voice-name');
  const testVoiceBtn = document.getElementById('test-voice-btn');

  // Initial sync with voice settings
  if (settingVoiceUrl && islandState.settings.voiceUrl) {
    settingVoiceUrl.value = islandState.settings.voiceUrl;
  }
  if (settingVoiceName && islandState.settings.voiceName) {
    settingVoiceName.value = islandState.settings.voiceName;
  }

  // Mic triggers
  const triggerVoice = (e) => {
    if (e) e.stopPropagation();
    voiceAssistant.toggleListening();
  };

  if (idleMicBtn) idleMicBtn.addEventListener('click', triggerVoice);
  if (headerMicBtn) headerMicBtn.addEventListener('click', triggerVoice);

  // Global key 'M' triggers mic when not in an input
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      triggerVoice();
    }
  });

  if (closeVoiceCardBtn) {
    closeVoiceCardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = document.getElementById('voice-assistant-card');
      if (card) card.style.display = 'none';
      voiceAssistant.stop();
    });
  }

  voiceChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const cmd = chip.dataset.cmd;
      if (cmd) voiceAssistant.processCommand(cmd);
    });
  });

  // Voice Settings
  if (settingVoiceUrl) {
    settingVoiceUrl.addEventListener('change', (e) => {
      islandState.updateSettings({ voiceUrl: e.target.value.trim() });
    });
  }

  if (settingVoiceName) {
    settingVoiceName.addEventListener('change', (e) => {
      islandState.updateSettings({ voiceName: e.target.value.trim() });
    });
  }

  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      voiceAssistant.respond("Testing your trained voice on Kali Island. Voice system is online and ready.");
    });
  }

  console.log('⚡ Kali Island coordinator initialized with app execution, dragging, settings, and voice assistant');
});
