use tauri::{AppHandle, Emitter};

pub fn setup_shortcuts(app: &AppHandle) {
    // When global shortcut plugin is activated, listen for Super+I toggle
    let _ = app.emit("shortcut:ready", true);
}
