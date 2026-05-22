use std::fs;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const DEFAULT_SHORTCUT: &str = "alt+shift+space";

struct ShortcutSetting(Mutex<String>);

fn config_file(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    let _ = fs::create_dir_all(&dir);
    Some(dir.join("shortcut.txt"))
}

fn load_shortcut(app: &tauri::AppHandle) -> String {
    config_file(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
}

fn save_shortcut(app: &tauri::AppHandle, shortcut: &str) -> Result<(), String> {
    let p = config_file(app).ok_or_else(|| "config dir unavailable".to_string())?;
    fs::write(p, shortcut).map_err(|e| e.to_string())
}

#[tauri::command]
fn show_window(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn hide_window(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn get_shortcut(state: State<ShortcutSetting>) -> String {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
fn set_shortcut(
    app_handle: tauri::AppHandle,
    state: State<ShortcutSetting>,
    shortcut: String,
) -> Result<(), String> {
    let trimmed = shortcut.trim().to_string();
    if trimmed.is_empty() {
        return Err("shortcut is empty".to_string());
    }
    let gs = app_handle.global_shortcut();
    let current = state.0.lock().unwrap().clone();
    let _ = gs.unregister(current.as_str());
    gs.register(trimmed.as_str()).map_err(|e| {
        // Re-register old one on failure so user keeps a working shortcut
        let _ = gs.register(current.as_str());
        e.to_string()
    })?;
    save_shortcut(&app_handle, &trimmed)?;
    *state.0.lock().unwrap() = trimmed;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = app.emit("shortcut-triggered", ());
                    }
                })
                .build(),
        )
        .setup(|app| {
            let handle = app.handle().clone();
            let shortcut = load_shortcut(&handle);
            app.manage(ShortcutSetting(Mutex::new(shortcut.clone())));

            if let Err(e) = app.global_shortcut().register(shortcut.as_str()) {
                eprintln!(
                    "[voicebox-overlay] failed to register shortcut '{}': {}",
                    shortcut, e
                );
            }

            let show_i = MenuItem::with_id(app, "show", "Show Overlay", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &settings_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Voicebox Overlay")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "settings" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit("open-settings", ());
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_window,
            hide_window,
            get_shortcut,
            set_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
