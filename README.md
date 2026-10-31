# Kali Island (Phase 1: Visual Prototype)

A premium, intelligent Dynamic Island desktop interface designed natively for **Kali Linux XFCE** (optimized for 3840×2160 4K HiDPI displays).

![Kali Island Idle](file:///home/sireebos/.gemini/antigravity-ide/brain/020f1829-a464-47f2-8016-dde15f26dbc4/kali_island_idle_v2.png)
![Kali Island Expanded](file:///home/sireebos/.gemini/antigravity-ide/brain/020f1829-a464-47f2-8016-dde15f26dbc4/kali_island_expanded.png)

---

## Features Implemented in Phase 1

- **Transparent Desktop Overlay**: Runs borderless and always-on-top at the top-center of the screen.
- **Dark Glassmorphism**: Tailored backdrop blur, multi-tier ambient shadows, specular highlight borders, and subtle Kali cyan/blue glows.
- **Morphing Spring Physics**:
  - **Idle Pill State**: Compact, unobtrusive capsule showing the Kali Dragon icon, active pulse indicator, subtle audio/system wave bars, live digital clock, and prototype tag.
  - **Hover Micro-Animation**: Smoothly expands with breathing spring physics when hovered.
  - **Expanded Floating Panel**: Click to morph into an expanded card with rounded corners (`border-radius: 32px` on 4K).
- **Navigation & Telemetry Cards**:
  - **Overview**: Real-time meters for CPU Utilization (8C/16T), System Memory (with ZRAM status), NVIDIA RTX 3060 status, and NVMe storage health.
  - **RTX 3060 & AI**: VRAM consumption (12.0 GB GDDR6) and local Ollama status for Qwen models.
  - **Media**: MPRIS session preview card with audio controls.
  - **Quick Actions**: Rapid-access action pills for Terminal, Docker, AI Chat, and Security.
- **Keyboard Shortcuts**:
  - `Super+I` or `Ctrl+I`: Toggle expand / collapse.
  - `Esc`: Collapse island back to idle pill.
  - `1`, `2`, `3`, `4`: Instant tab switching while expanded.
  - `T`: Cycle themes (Dark, OLED Dark, Kali Cyber Accent).
  - Outside Click: Collapses expanded island.
- **X11 Fullscreen Detection**: Queries `_NET_WM_STATE` to detect when games or media enter fullscreen, automatically tucking the Island away so it never obstructs content.

---

## How to Launch

### 1. Instant Desktop Overlay (Zero-Sudo)
To launch the transparent overlay directly on your Kali desktop right now:
```bash
npm run start:desktop
```

### 2. Browser Dev Preview
To run the live Vite development server:
```bash
npm run dev
```

### 3. Automatic Startup on Boot (Autostart)
Kali Island is configured to launch automatically whenever your PC turns on and logs into the XFCE desktop.
- Autostart desktop entry: `~/.config/autostart/kali-island.desktop`
- Launcher script: `runner/start-island.sh` (handles X11 display detection, compositor stability delay, and single-instance locking)
- You can also toggle autostart directly from the **Settings (Tab 5) -> System & Startup** panel in the island interface.

### 4. Tauri v2 (Rust Backend)
Once native development libraries are installed (`sudo apt install pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev librsvg2-dev`):
```bash
cargo tauri dev
```
