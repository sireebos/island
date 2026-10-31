use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

pub fn configure_top_center_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(Some(monitor)) = window.primary_monitor() {
            let screen_width = monitor.size().width;
            let win_width = 760;
            let win_height = 520;
            let pos_x = ((screen_width as i32) - (win_width as i32)) / 2;
            let pos_y = 0;

            let _ = window.set_size(PhysicalSize::new(win_width as u32, win_height as u32));
            let _ = window.set_position(PhysicalPosition::new(pos_x, pos_y));
            let _ = window.set_always_on_top(true);
        }
    }
}
