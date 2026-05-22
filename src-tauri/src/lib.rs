use std::fs;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const DEFAULT_SHORTCUT: &str = "alt+shift+space";
const DEFAULT_PROVIDER: &str = "voicebox";
const DEFAULT_API_URL: &str = "http://localhost:17493";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
struct AppConfig {
    shortcut: String,
    provider: String,
    api_url: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            shortcut: DEFAULT_SHORTCUT.to_string(),
            provider: DEFAULT_PROVIDER.to_string(),
            api_url: DEFAULT_API_URL.to_string(),
        }
    }
}

struct ConfigState(Mutex<AppConfig>);

fn config_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    let _ = fs::create_dir_all(&dir);
    Some(dir.join("config.json"))
}

fn load_config(app: &tauri::AppHandle) -> AppConfig {
    let path = match config_path(app) {
        Some(p) => p,
        None => return AppConfig::default(),
    };
    match fs::read_to_string(&path) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => {
            // Migrate legacy shortcut.txt if present
            if let Some(dir) = app.path().app_config_dir().ok() {
                let legacy = dir.join("shortcut.txt");
                if let Ok(content) = fs::read_to_string(&legacy) {
                    let trimmed = content.trim().to_string();
                    if !trimmed.is_empty() {
                        let mut cfg = AppConfig::default();
                        cfg.shortcut = trimmed;
                        let _ = fs::remove_file(&legacy);
                        return cfg;
                    }
                }
            }
            AppConfig::default()
        }
    }
}

fn save_config(app: &tauri::AppHandle, cfg: &AppConfig) -> Result<(), String> {
    let path = config_path(app).ok_or_else(|| "config dir unavailable".to_string())?;
    let json = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
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
fn quit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
fn get_config(state: State<ConfigState>) -> AppConfig {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
fn set_config(
    app_handle: tauri::AppHandle,
    state: State<ConfigState>,
    config: AppConfig,
) -> Result<AppConfig, String> {
    let mut new_cfg = config;
    new_cfg.shortcut = new_cfg.shortcut.trim().to_string();
    new_cfg.provider = new_cfg.provider.trim().to_string();
    new_cfg.api_url = new_cfg.api_url.trim().to_string();

    if new_cfg.shortcut.is_empty() {
        return Err("shortcut is empty".to_string());
    }
    if new_cfg.provider.is_empty() {
        return Err("provider is empty".to_string());
    }

    let current = state.0.lock().unwrap().clone();

    // Re-register shortcut only if it changed
    if new_cfg.shortcut != current.shortcut {
        let gs = app_handle.global_shortcut();
        let _ = gs.unregister(current.shortcut.as_str());
        gs.register(new_cfg.shortcut.as_str()).map_err(|e| {
            let _ = gs.register(current.shortcut.as_str());
            format!("shortcut register failed: {}", e)
        })?;
    }

    save_config(&app_handle, &new_cfg)?;
    *state.0.lock().unwrap() = new_cfg.clone();
    let _ = app_handle.emit("config-updated", new_cfg.clone());
    Ok(new_cfg)
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
            let cfg = load_config(&handle);
            app.manage(ConfigState(Mutex::new(cfg.clone())));

            if let Err(e) = app.global_shortcut().register(cfg.shortcut.as_str()) {
                eprintln!(
                    "[voicebox-overlay] failed to register shortcut '{}': {}",
                    cfg.shortcut, e
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
            quit_app,
            get_config,
            set_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
