/**
 * Kali Island - Voice Command & Response Subsystem
 * Supports speech recognition, voice commands, local Ollama AI responses,
 * and text-to-speech with user trained voice integration.
 */

export class VoiceAssistant {
  constructor(state, animator) {
    this.state = state;
    this.animator = animator;
    this.isListening = false;
    this.recognition = null;
    this.synth = window.speechSynthesis;

    this.initRecognition();
  }

  initRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.onVoiceStateChange('listening');
        };

        this.recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(res => res[0].transcript)
            .join('');

          this.updateTranscript(transcript);

          if (event.results[0].isFinal) {
            this.processCommand(transcript);
          }
        };

        this.recognition.onerror = (err) => {
          console.warn('[Kali Island Voice] Recognition error:', err.error);
          this.isListening = false;
          this.onVoiceStateChange('idle');
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.onVoiceStateChange('idle');
        };
      } catch (e) {
        console.warn('SpeechRecognition initialization error:', e);
      }
    }
  }

  toggleListening() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    // Open expanded island if in idle so user sees the assistant card
    if (this.state.status === 'idle' || this.state.status === 'hover') {
      this.state.setStatus('expanded');
      this.animator.expand();
    }

    this.showVoiceCard();

    if (this.recognition) {
      try {
        this.recognition.start();
        return;
      } catch (err) {
        console.warn('Recognition start exception, using interactive prompt:', err);
      }
    }

    // Fallback: If Web Speech recognition is not available or blocked in browser
    this.onVoiceStateChange('listening');
    this.updateTranscript('Listening... (or type below)');
  }

  stop() {
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch {}
    }
    this.isListening = false;
    this.onVoiceStateChange('idle');
  }

  async processCommand(rawText) {
    const text = rawText.trim().toLowerCase();
    if (!text) return;

    this.updateTranscript(rawText);
    this.onVoiceStateChange('processing');

    // 1. Check direct commands
    if (text.includes('terminal')) {
      if (window.islandDesktopAPI && window.islandDesktopAPI.launchApp) {
        window.islandDesktopAPI.launchApp('x-terminal-emulator');
      }
      this.respond("Opening terminal.");
      return;
    }

    if (text.includes('file') || text.includes('thunar') || text.includes('folder')) {
      if (window.islandDesktopAPI && window.islandDesktopAPI.launchApp) {
        window.islandDesktopAPI.launchApp('thunar');
      }
      this.respond("Opening file manager.");
      return;
    }

    if (text.includes('browser') || text.includes('firefox') || text.includes('internet')) {
      if (window.islandDesktopAPI && window.islandDesktopAPI.launchApp) {
        window.islandDesktopAPI.launchApp('firefox');
      }
      this.respond("Launching Firefox.");
      return;
    }

    if (text.includes('docker')) {
      if (window.islandDesktopAPI && window.islandDesktopAPI.launchApp) {
        window.islandDesktopAPI.launchApp('x-terminal-emulator -e "docker ps; bash"');
      }
      this.respond("Opening Docker status.");
      return;
    }

    if (text.includes('gpu') || text.includes('3060') || text.includes('vram')) {
      this.state.setTab('gpu');
      const tel = this.state.telemetry;
      this.respond(`NVIDIA GeForce RTX 3060 is running at ${tel.gpu}% utilization and ${tel.gpuTemp} degrees celsius with ${tel.vramUsed} VRAM used.`);
      return;
    }

    if (text.includes('cpu')) {
      this.state.setTab('overview');
      const tel = this.state.telemetry;
      this.respond(`CPU load is currently ${tel.cpu}%.`);
      return;
    }

    if (text.includes('memory') || text.includes('ram')) {
      this.state.setTab('overview');
      const tel = this.state.telemetry;
      this.respond(`Memory usage is ${tel.ram}% at ${tel.ramUsed}.`);
      return;
    }

    if (text.includes('theme')) {
      if (text.includes('oled')) {
        this.state.setTheme('oled');
        this.respond("Switched to OLED theme.");
      } else if (text.includes('cyber')) {
        this.state.setTheme('cyber');
        this.respond("Switched to Cyber theme.");
      } else {
        this.state.setTheme('dark');
        this.respond("Switched to Dark theme.");
      }
      return;
    }

    if (text.includes('collapse') || text.includes('close') || text.includes('minimize')) {
      this.respond("Collapsing island.");
      setTimeout(() => {
        this.state.setStatus('idle');
        this.animator.collapse();
      }, 900);
      return;
    }

    // 2. Query Local Ollama AI
    try {
      const response = await this.queryOllama(rawText);
      this.respond(response);
    } catch {
      this.respond(`Command received: ${rawText}`);
    }
  }

  async queryOllama(prompt) {
    try {
      const systemPrompt = `You are Kali Island, an intelligent assistant on Kali Linux. Give a brief, direct answer in 1-2 sentences.`;
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen:latest',
          prompt: `${systemPrompt}\nUser: ${prompt}\nAssistant:`,
          stream: false
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        return data.response ? data.response.trim() : "I am ready for your command.";
      }
    } catch (err) {
      console.warn('[Kali Island] Ollama query note:', err.message);
    }

    return `Command processed: ${prompt}`;
  }

  respond(text) {
    this.onVoiceStateChange('speaking');
    this.updateResponse(text);

    // Speak aloud using trained voice server or native system TTS
    const voiceUrl = (this.state.settings && this.state.settings.voiceUrl) || 'http://localhost:8880/v1/audio/speech';
    const voiceName = (this.state.settings && this.state.settings.voiceName) || 'nova';

    if (window.islandDesktopAPI && window.islandDesktopAPI.speak) {
      window.islandDesktopAPI.speak({ text, voiceUrl, voiceName });
    } else if (this.synth) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        this.synth.speak(utterance);
      } catch {}
    }

    setTimeout(() => {
      this.onVoiceStateChange('idle');
    }, Math.max(2000, text.length * 70));
  }

  showVoiceCard() {
    const card = document.getElementById('voice-assistant-card');
    if (card) card.style.display = 'flex';
  }

  updateTranscript(text) {
    const el = document.getElementById('voice-transcript-text');
    if (el) el.textContent = text || 'Listening...';
  }

  updateResponse(text) {
    const el = document.getElementById('voice-response-text');
    if (el) el.textContent = text;
  }

  onVoiceStateChange(status) {
    const micBtns = document.querySelectorAll('.mic-btn');
    const statusLabel = document.getElementById('voice-status-label');
    const waveEl = document.getElementById('voice-wave-anim');

    micBtns.forEach(btn => {
      btn.classList.toggle('active-listening', status === 'listening');
      btn.classList.toggle('speaking', status === 'speaking');
    });

    if (statusLabel) {
      if (status === 'listening') statusLabel.textContent = 'Listening... Speak your command';
      else if (status === 'processing') statusLabel.textContent = 'Processing command...';
      else if (status === 'speaking') statusLabel.textContent = 'Responding with trained voice...';
      else statusLabel.textContent = 'Voice Assistant Ready';
    }

    if (waveEl) {
      waveEl.style.display = (status === 'listening' || status === 'speaking') ? 'flex' : 'none';
    }
  }
}
