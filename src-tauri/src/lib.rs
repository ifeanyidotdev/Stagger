mod git;
mod github;
mod settings;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_git_status,
            commands::get_git_log,
            commands::get_file_diff,
            commands::stage_file,
            commands::unstage_file,
            commands::stage_files,
            commands::unstage_files,
            commands::apply_patch_to_index,
            commands::run_git_cli_cmd,
            commands::login_with_github,
            commands::request_github_token,
            commands::run_github_api_request,
            commands::get_branches,
            commands::get_all_branches,
            commands::select_folder,
            commands::get_global_settings,
            commands::save_global_settings,
            commands::get_system_git_config,
            commands::read_file_content,
            commands::write_file_content,
            commands::select_file,
            commands::get_workspace_settings,
            commands::save_workspace_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
