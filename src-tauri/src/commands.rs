use crate::git::{
    self, GitStatusResult, CommitInfo, DiffInfo, GitCliResult
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
pub fn apply_patch_to_index(repo_path: String, patch_content: String) -> Result<GitCliResult, String> {
    git::apply_patch_to_index_impl(&repo_path, &patch_content)
}

#[tauri::command]
pub fn run_git_cli_cmd(repo_path: String, args: Vec<String>) -> Result<GitCliResult, String> {
    git::run_git_cli_cmd_impl(&repo_path, &args)
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
pub fn stage_files(repo_path: String, file_paths: Vec<String>) -> Result<(), String> {
    git::stage_files_impl(&repo_path, file_paths)
}

#[tauri::command]
pub fn unstage_files(repo_path: String, file_paths: Vec<String>) -> Result<(), String> {
    git::unstage_files_impl(&repo_path, file_paths)
}


