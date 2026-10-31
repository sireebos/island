use std::process::Command;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub fn start_fullscreen_monitor(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let mut was_fullscreen = false;

        loop {
            std::thread::sleep(Duration::from_millis(1500));

            // Check active window via xprop
            let output = Command::new("xprop")
                .args(["-root", "_NET_ACTIVE_WINDOW"])
                .output();

            if let Ok(out) = output {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if let Some(id_part) = stdout.split("window id # ").nth(1) {
                    let win_id = id_part.trim().split(',').next().unwrap_or("").trim();
                    if !win_id.is_empty() {
                        let state_output = Command::new("xprop")
                            .args(["-id", win_id, "_NET_WM_STATE"])
                            .output();

                        if let Ok(state_out) = state_output {
                            let state_str = String::from_utf8_lossy(&state_out.stdout);
                            let is_fullscreen = state_str.contains("_NET_WM_STATE_FULLSCREEN");

                            if is_fullscreen != was_fullscreen {
                                was_fullscreen = is_fullscreen;
                                let _ = app_handle.emit("fullscreen:changed", is_fullscreen);
                            }
                        }
                    }
                }
            }
        }
    });
}
