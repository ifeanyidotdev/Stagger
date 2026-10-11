use crate::git::{
    self, GitStatusResult, CommitInfo, DiffInfo, GitCliResult, BranchInfo
};
use crate::github;

#[tauri::command]
pub fn get_git_status(repo_path: String) -> Result<GitStatusResult, String> {
    git::get_git_status_impl(&repo_path)
}

#[tauri::command]
pub fn get_git_log(repo_path: String, limit: Option<usize>) -> Result<Vec<CommitInfo>, String> {
    git::get_git_log_impl(&repo_path, limit)
}

#[tauri::command]
pub fn get_file_diff(repo_path: String, file_path: String, staged: bool) -> Result<DiffInfo, String> {
    git::get_file_diff_impl(&repo_path, &file_path, staged)
}

#[tauri::command]
pub fn stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    git::stage_file_impl(&repo_path, &file_path)
}

#[tauri::command]
pub fn unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    git::unstage_file_impl(&repo_path, &file_path)
}

#[tauri::command]
pub async fn apply_patch_to_index(repo_path: String, patch_content: String) -> Result<GitCliResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        git::apply_patch_to_index_impl(&repo_path, &patch_content)
    })
    .await
    .map_err(|e| format!("Task execution error: {}", e))?
}

#[tauri::command]
pub async fn run_git_cli_cmd(repo_path: String, args: Vec<String>) -> Result<GitCliResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        git::run_git_cli_cmd_impl(&repo_path, &args)
    })
    .await
    .map_err(|e| format!("Task execution error: {}", e))?
}

#[tauri::command]
pub fn login_with_github() -> Result<String, String> {
    github::login_with_github_impl()
}

#[tauri::command]
pub fn request_github_token(
    client_id: String,
    client_secret: String,
    code: String,
) -> Result<String, String> {
    github::request_github_token_impl(&client_id, &client_secret, &code)
}

#[tauri::command]
pub fn run_github_api_request(
    token: String,
    path: String,
    method: String,
    body: Option<String>,
) -> Result<String, String> {
    github::run_github_api_request_impl(&token, &path, &method, body.as_deref())
}

#[tauri::command]
pub fn get_branches(repo_path: String) -> Result<Vec<String>, String> {
    git::get_branches_impl(&repo_path)
}

#[tauri::command]
pub fn get_all_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    git::get_all_branches_impl(&repo_path)
}

#[tauri::command]
pub fn stage_files(repo_path: String, file_paths: Vec<String>) -> Result<(), String> {
    git::stage_files_impl(&repo_path, file_paths)
}

#[tauri::command]
pub fn unstage_files(repo_path: String, file_paths: Vec<String>) -> Result<(), String> {
    git::unstage_files_impl(&repo_path, file_paths)
}

#[tauri::command]
pub async fn select_folder() -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_title("Select Workspace Folder")
            .pick_folder()
            .map(|path| path.to_string_lossy().into_owned())
    })
    .await
    .unwrap_or(None)
}

#[tauri::command]
pub fn get_global_settings() -> Result<crate::settings::GlobalSettings, String> {
    crate::settings::get_global_settings_impl()
}

#[tauri::command]
pub fn save_global_settings(settings: crate::settings::GlobalSettings) -> Result<crate::settings::GlobalSettings, String> {
    crate::settings::save_global_settings_impl(&settings)
}

#[tauri::command]
pub fn get_system_git_config() -> Result<crate::settings::SystemGitConfig, String> {
    Ok(crate::settings::get_system_git_config_impl())
}

#[tauri::command]
pub fn read_file_content(path: String) -> Result<String, String> {
    crate::settings::read_file_content_impl(&path)
}

#[tauri::command]
pub fn write_file_content(path: String, content: String) -> Result<(), String> {
    crate::settings::write_file_content_impl(&path, &content)
}

#[tauri::command]
pub async fn select_file(title: Option<String>, default_path: Option<String>) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = rfd::FileDialog::new();
        if let Some(t) = title {
            dialog = dialog.set_title(&t);
        }
        if let Some(p) = default_path {
            let expanded = crate::settings::expand_tilde(&p);
            if expanded.exists() {
                if expanded.is_dir() {
                    dialog = dialog.set_directory(&expanded);
                } else if let Some(parent) = expanded.parent() {
                    dialog = dialog.set_directory(parent);
                }
            }
        }
        dialog.pick_file().map(|path| path.to_string_lossy().into_owned())
    })
    .await
    .unwrap_or(None)
}

#[tauri::command]
pub fn get_workspace_settings(repo_path: String) -> Result<crate::settings::WorkspaceSettings, String> {
    crate::settings::get_workspace_settings_impl(&repo_path)
}

#[tauri::command]
pub fn save_workspace_settings(
    repo_path: String,
    remote_url: Option<String>,
    local_user_name: Option<String>,
    local_user_email: Option<String>,
) -> Result<crate::settings::WorkspaceSettings, String> {
    crate::settings::save_workspace_settings_impl(&repo_path, remote_url, local_user_name, local_user_email)
}




