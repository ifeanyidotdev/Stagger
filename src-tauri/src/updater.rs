use std::sync::atomic::{AtomicBool, Ordering};
use serde::Serialize;
use tauri::Emitter;
use tauri_plugin_updater::UpdaterExt;

static IS_DOWNLOADING: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Clone, Debug)]
pub struct AppBuildInfo {
    pub version: String,
    pub app_name: String,
    pub default_channel: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct AppUpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub version: Option<String>,
    pub date: Option<String>,
    pub body: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct UpdateDownloadProgressPayload {
    pub downloaded: usize,
    pub total: Option<u64>,
    pub percentage: Option<f64>,
}

fn resolve_channel_endpoints(channel: Option<String>, app: &tauri::AppHandle) -> Vec<String> {
    let target_channel = channel.unwrap_or_else(|| {
        let name = app.package_info().name.to_lowercase();
        if name.contains("dev") {
            "dev".to_string()
        } else {
            "main".to_string()
        }
    });

    if target_channel == "dev" {
        vec![
            "https://github.com/ifeanyidotdev/Stagger/releases/download/dev-channel/latest.json".to_string(),
            "https://github.com/ifeanyidotdev/Stagger/releases/download/dev/latest.json".to_string(),
        ]
    } else {
        vec![
            "https://github.com/ifeanyidotdev/Stagger/releases/latest/download/latest.json".to_string(),
        ]
    }
}

#[tauri::command]
pub fn get_app_build_info(app: tauri::AppHandle) -> AppBuildInfo {
    let name = app.package_info().name.clone();
    let default_channel = if name.to_lowercase().contains("dev") {
        "dev".to_string()
    } else {
        "main".to_string()
    };

    AppBuildInfo {
        version: app.package_info().version.to_string(),
        app_name: name,
        default_channel,
    }
}

#[tauri::command]
pub async fn check_app_update(
    app: tauri::AppHandle,
    channel: Option<String>,
) -> Result<AppUpdateInfo, String> {
    let endpoint_strings = resolve_channel_endpoints(channel, &app);
    let mut parsed_urls = Vec::new();
    for endpoint_url in &endpoint_strings {
        if let Ok(u) = url::Url::parse(endpoint_url) {
            parsed_urls.push(u);
        }
    }

    if parsed_urls.is_empty() {
        return Err("No valid update endpoints configured.".to_string());
    }

    let current_version = app.package_info().version.to_string();

    let updater = app
        .updater_builder()
        .endpoints(parsed_urls)
        .map_err(|e| format!("Failed to configure updater endpoints: {}", e))?
        .build()
        .map_err(|e| format!("Failed to build updater: {}", e))?;

    match updater.check().await {
        Ok(Some(update)) => Ok(AppUpdateInfo {
            available: true,
            current_version,
            version: Some(update.version.clone()),
            date: update.date.map(|d| d.to_string()),
            body: update.body.clone(),
        }),
        Ok(None) => Ok(AppUpdateInfo {
            available: false,
            current_version,
            version: None,
            date: None,
            body: None,
        }),
        Err(e) => Err(format!("Update check failed: {}", e)),
    }
}

#[tauri::command]
pub async fn download_and_install_update(
    app: tauri::AppHandle,
    channel: Option<String>,
) -> Result<(), String> {
    if IS_DOWNLOADING.swap(true, Ordering::SeqCst) {
        return Err("Update download already in progress.".to_string());
    }

    struct DownloadGuard;
    impl Drop for DownloadGuard {
        fn drop(&mut self) {
            IS_DOWNLOADING.store(false, Ordering::SeqCst);
        }
    }
    let _guard = DownloadGuard;

    let endpoint_strings = resolve_channel_endpoints(channel, &app);
    let mut parsed_urls = Vec::new();
    for endpoint_url in &endpoint_strings {
        if let Ok(u) = url::Url::parse(endpoint_url) {
            parsed_urls.push(u);
        }
    }

    if parsed_urls.is_empty() {
        return Err("No valid update endpoints configured.".to_string());
    }

    let updater = app
        .updater_builder()
        .endpoints(parsed_urls)
        .map_err(|e| format!("Failed to configure updater endpoints: {}", e))?
        .build()
        .map_err(|e| format!("Failed to build updater: {}", e))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Failed to verify update before download: {}", e))?
        .ok_or_else(|| "No update is currently available to install.".to_string())?;

    let app_handle = app.clone();
    let mut downloaded_bytes = 0usize;

    update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded_bytes += chunk_length;
                let pct = content_length.map(|total| {
                    if total > 0 {
                        ((downloaded_bytes as f64 / total as f64) * 100.0).round()
                    } else {
                        0.0
                    }
                });

                let _ = app_handle.emit(
                    "update-progress",
                    UpdateDownloadProgressPayload {
                        downloaded: downloaded_bytes,
                        total: content_length,
                        percentage: pct,
                    },
                );
            },
            || {
                // Finished download and installation preparation
            },
        )
        .await
        .map_err(|e| format!("Failed to download and install update: {}", e))?;

    let _ = app.emit("update-ready", ());

    Ok(())
}

#[tauri::command]
pub fn restart_app(app: tauri::AppHandle) {
    app.restart();
}
