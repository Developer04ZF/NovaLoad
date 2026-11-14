// Licensed under Apache-2.0

pub mod engine;
pub mod security;

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, RunEvent,
};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopBackendInfo {
    pub base_url: String,
    pub token: Option<String>,
    pub port: u16,
    pub ready: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct ReadyLinePayload {
    port: u16,
    host: String,
    token: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdaterCheckResult {
    pub supported: bool,
    pub status: String,
    pub current_version: String,
    pub available_version: Option<String>,
    pub notes: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInstallResult {
    pub ok: bool,
    pub message: String,
}

#[derive(Default)]
struct BackendRuntime {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    info: Option<DesktopBackendInfo>,
}

#[derive(Clone, Default)]
struct BackendState(Arc<Mutex<BackendRuntime>>);

impl BackendState {
    fn snapshot(&self) -> DesktopBackendInfo {
        let guard = self.0.lock().unwrap();
        guard.info.clone().unwrap_or(DesktopBackendInfo {
            base_url: String::new(),
            token: None,
            port: 0,
            ready: false,
            error: None,
        })
    }

    fn set_error(&self, message: String) {
        let mut guard = self.0.lock().unwrap();
        guard.info = Some(DesktopBackendInfo {
            base_url: String::new(),
            token: None,
            port: 0,
            ready: false,
            error: Some(message),
        });
    }

    fn shutdown(&self) {
        let mut guard = self.0.lock().unwrap();
        // Dropping stdin signals NOVALOAD_STDIN_WATCHDOG=1 in the Node sidecar for clean drain
        guard.stdin.take();
        if let Some(mut child) = guard.child.take() {
            let deadline = Instant::now() + Duration::from_secs(3);
            while Instant::now() < deadline {
                if let Ok(Some(_)) = child.try_wait() {
                    return;
                }
                std::thread::sleep(Duration::from_millis(80));
            }
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

pub fn parse_ready_line(line: &str) -> Option<DesktopBackendInfo> {
    let json_part = line.trim().strip_prefix("NOVALOAD_READY ")?;
    let parsed: ReadyLinePayload = serde_json::from_str(json_part).ok()?;
    Some(DesktopBackendInfo {
        base_url: format!("http://{}:{}", parsed.host, parsed.port),
        token: parsed.token,
        port: parsed.port,
        ready: true,
        error: None,
    })
}

fn resolve_sidecar_binary() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| format!("Unable to locate current exe: {e}"))?;
    let exe_dir = exe
        .parent()
        .ok_or_else(|| "Current executable has no parent directory.".to_string())?;
    let suffix = if cfg!(windows) { ".exe" } else { "" };

    let target_triple = if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        "x86_64-pc-windows-msvc"
    } else if cfg!(all(target_os = "windows", target_arch = "aarch64")) {
        "aarch64-pc-windows-msvc"
    } else if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        "aarch64-apple-darwin"
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        "x86_64-apple-darwin"
    } else if cfg!(all(target_os = "linux", target_arch = "aarch64")) {
        "aarch64-unknown-linux-gnu"
    } else {
        "x86_64-unknown-linux-gnu"
    };

    let candidates = [
        exe_dir.join(format!("novaload-server{suffix}")),
        exe_dir.join(format!("novaload-server-{target_triple}{suffix}")),
        exe_dir.join(format!("binaries/novaload-server-{target_triple}{suffix}")),
        PathBuf::from(format!("src-tauri/binaries/novaload-server-{target_triple}{suffix}")),
    ];

    for path in candidates {
        if path.is_file() {
            return Ok(path);
        }
    }

    Err(format!(
        "Embedded backend executable 'novaload-server' was not found alongside {}. Build sidecar first via 'npm run build:sidecar'.",
        exe_dir.display()
    ))
}

fn start_backend_sidecar(app: &AppHandle, state: BackendState) {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(err) => {
            state.set_error(format!("Failed to resolve OS app data directory: {err}"));
            return;
        }
    };
    if let Err(err) = std::fs::create_dir_all(&app_data_dir) {
        state.set_error(format!("Failed to create NovaLoad data directory: {err}"));
        return;
    }

    let sidecar_path = match resolve_sidecar_binary() {
        Ok(p) => p,
        Err(err) => {
            state.set_error(err);
            return;
        }
    };

    let mut cmd = Command::new(&sidecar_path);
    cmd.args(["--desktop", "--port", "0", "--host", "127.0.0.1"])
        .arg("--data-dir")
        .arg(&app_data_dir)
        .env("NOVALOAD_DESKTOP", "1")
        .env("NOVALOAD_STDIN_WATCHDOG", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(err) => {
            state.set_error(format!(
                "Failed to launch embedded NovaLoad backend ({}): {err}",
                sidecar_path.display()
            ));
            return;
        }
    };

    let stdin = child.stdin.take();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    {
        let mut guard = state.0.lock().unwrap();
        guard.child = Some(child);
        guard.stdin = stdin;
        guard.info = Some(DesktopBackendInfo {
            base_url: String::new(),
            token: None,
            port: 0,
            ready: false,
            error: None,
        });
    }

    let stderr_tail = Arc::new(Mutex::new(Vec::<String>::new()));
    if let Some(err_stream) = stderr {
        let tail_ref = stderr_tail.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(err_stream);
            for line in reader.lines().map_while(Result::ok) {
                let mut t = tail_ref.lock().unwrap();
                t.push(line);
                if t.len() > 25 {
                    t.remove(0);
                }
            }
        });
    }

    let state_for_stdout = state.clone();
    std::thread::spawn(move || {
        if let Some(out_stream) = stdout {
            let reader = BufReader::new(out_stream);
            for line in reader.lines().map_while(Result::ok) {
                if let Some(info) = parse_ready_line(&line) {
                    let mut guard = state_for_stdout.0.lock().unwrap();
                    guard.info = Some(info);
                }
            }
        }

        // If stdout closes before NOVALOAD_READY was seen, surface visible failure diagnostics
        let mut guard = state_for_stdout.0.lock().unwrap();
        let was_ready = guard.info.as_ref().is_some_and(|i| i.ready);
        if !was_ready {
            let err_lines = stderr_tail.lock().unwrap().join(" | ");
            let msg = if err_lines.is_empty() {
                "NovaLoad embedded backend exited unexpectedly before becoming ready.".to_string()
            } else {
                format!("NovaLoad embedded backend failed to start: {err_lines}")
            };
            guard.info = Some(DesktopBackendInfo {
                base_url: String::new(),
                token: None,
                port: 0,
                ready: false,
                error: Some(msg),
            });
        }
    });
}

#[tauri::command]
fn get_backend_info(state: tauri::State<'_, BackendState>) -> DesktopBackendInfo {
    state.snapshot()
}

#[tauri::command]
fn validate_url_command(raw_url: String) -> Result<String, String> {
    security::validate_download_url(&raw_url, true).map(|u| u.to_string())
}

#[tauri::command]
fn store_secret_in_keyring(service: String, account: String, secret: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, &account).map_err(|e| e.to_string())?;
    entry.set_password(&secret).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_secret_from_keyring(service: String, account: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(&service, &account).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(pw) => Ok(Some(pw)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn delete_secret_from_keyring(service: String, account: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, &account).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_for_updates(app: AppHandle) -> UpdaterCheckResult {
    let current_version = app.package_info().version.to_string();
    let updater = match app.updater() {
        Ok(u) => u,
        Err(err) => {
            let msg = err.to_string();
            let is_pubkey_missing = msg.to_lowercase().contains("pubkey");
            return UpdaterCheckResult {
                supported: true,
                status: if is_pubkey_missing {
                    "unconfigured".to_string()
                } else {
                    "error".to_string()
                },
                current_version,
                available_version: None,
                notes: None,
                message: if is_pubkey_missing {
                    "Signed auto-update public key is not configured in this build. Check https://github.com/Developer04ZF/NovaLoad/releases for verified signed installers."
                        .to_string()
                } else {
                    format!("Updater initialization failed: {msg}")
                },
            };
        }
    };

    match updater.check().await {
        Ok(Some(update)) => UpdaterCheckResult {
            supported: true,
            status: "update-available".to_string(),
            current_version,
            available_version: Some(update.version.clone()),
            notes: update.body.clone(),
            message: format!("NovaLoad v{} is available from verified GitHub Releases.", update.version),
        },
        Ok(None) => UpdaterCheckResult {
            supported: true,
            status: "up-to-date".to_string(),
            current_version: current_version.clone(),
            available_version: None,
            notes: None,
            message: format!("NovaLoad v{current_version} is up to date."),
        },
        Err(err) => UpdaterCheckResult {
            supported: true,
            status: "error".to_string(),
            current_version,
            available_version: None,
            notes: None,
            message: format!("Update check failed: {err}"),
        },
    }
}

#[tauri::command]
async fn install_update(app: AppHandle) -> UpdateInstallResult {
    let updater = match app.updater() {
        Ok(u) => u,
        Err(err) => {
            return UpdateInstallResult {
                ok: false,
                message: format!("Signed updater unavailable: {err}"),
            }
        }
    };

    match updater.check().await {
        Ok(Some(update)) => match update.download_and_install(|_, _| {}, || {}).await {
            Ok(_) => UpdateInstallResult {
                ok: true,
                message: format!("Update v{} downloaded, signature-verified, and scheduled for restart.", update.version),
            },
            Err(err) => UpdateInstallResult {
                ok: false,
                message: format!("Failed to install signed update: {err}"),
            },
        },
        Ok(None) => UpdateInstallResult {
            ok: false,
            message: "No newer release is currently available.".to_string(),
        },
        Err(err) => UpdateInstallResult {
            ok: false,
            message: format!("Update verification failed: {err}"),
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_state = BackendState::default();
    let app = tauri::Builder::default()
        .manage(backend_state.clone())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let state = app.state::<BackendState>().inner().clone();
            start_backend_sidecar(app.handle(), state);

            let show_item = MenuItem::with_id(app, "show", "Open NovaLoad", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_backend_info,
            validate_url_command,
            store_secret_in_keyring,
            get_secret_from_keyring,
            delete_secret_from_keyring,
            check_for_updates,
            install_update
        ])
        .build(tauri::generate_context!())
        .expect("error while building NovaLoad desktop shell");

    app.run(move |_app_handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            backend_state.shutdown();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::parse_ready_line;

    #[test]
    fn parses_sidecar_ready_signal() {
        let line = r#"NOVALOAD_READY {"port":54321,"host":"127.0.0.1","desktop":true,"token":"nl_local_abc"}"#;
        let parsed = parse_ready_line(line).expect("should parse valid ready marker");
        assert_eq!(parsed.port, 54321);
        assert_eq!(parsed.base_url, "http://127.0.0.1:54321");
        assert_eq!(parsed.token.as_deref(), Some("nl_local_abc"));
        assert!(parsed.ready);
        assert!(parsed.error.is_none());
    }
}
