export type AppTheme = 'catppuccin-mocha' | 'catppuccin-latte' | 'cosmic-dark';

export interface GlobalSettings {
  git_user_name?: string | null;
  git_user_email?: string | null;
  git_default_branch?: string | null;
  global_gitignore_path?: string | null;
  sync_git_global_config?: boolean | null;
  ai_provider?: 'gemini' | 'openai' | null;
  gemini_api_key?: string | null;
  gemini_model?: string | null;
  openai_api_key?: string | null;
  openai_model?: string | null;
  openai_base_url?: string | null;
  default_pull_strategy?: 'prompt' | 'merge' | 'rebase' | null;
  auto_open_pull_dialog?: boolean | null;
  default_pr_merge_method?: 'merge' | 'squash' | 'rebase' | null;
  theme?: AppTheme | null;
  update_channel?: 'main' | 'dev' | null;
  auto_check_updates?: boolean | null;
}

export interface AppBuildInfo {
  version: string;
  app_name: string;
  default_channel: 'main' | 'dev';
}

export interface AppUpdateInfo {
  available: boolean;
  current_version: string;
  version?: string | null;
  date?: string | null;
  body?: string | null;
}

export interface UpdateDownloadProgress {
  downloaded: number;
  total?: number | null;
  percentage?: number | null;
}

export interface SystemGitConfig {
  user_name?: string | null;
  user_email?: string | null;
  default_branch?: string | null;
  excludes_file?: string | null;
  pull_rebase?: string | null;
}

export interface WorkspaceSettings {
  repo_path: string;
  remote_url?: string | null;
  local_user_name?: string | null;
  local_user_email?: string | null;
  has_local_identity: boolean;
  gitignore_exists: boolean;
  pull_strategy?: 'inherit' | 'prompt' | 'merge' | 'rebase' | null;
}
