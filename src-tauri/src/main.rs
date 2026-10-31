// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod window;
mod shortcuts;
mod fullscreen;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            window::configure_top_center_window(&handle);
            shortcuts::setup_shortcuts(&handle);
            fullscreen::start_fullscreen_monitor(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Kali Island application");
}
