use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct GlobalSettings {
    pub git_user_name: Option<String>,
    pub git_user_email: Option<String>,
    pub git_default_branch: Option<String>,
    pub global_gitignore_path: Option<String>,
    pub sync_git_global_config: Option<bool>,
    pub ai_provider: Option<String>, // "gemini" | "openai"
    pub gemini_api_key: Option<String>,
    pub gemini_model: Option<String>,
    pub openai_api_key: Option<String>,
    pub openai_model: Option<String>,
    pub openai_base_url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SystemGitConfig {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub default_branch: Option<String>,
    pub excludes_file: Option<String>,
}

pub fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with("~/") || path == "~" {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        if path == "~" {
            PathBuf::from(home)
        } else {
            Path::new(&home).join(&path[2..])
        }
    } else {
        PathBuf::from(path)
    }
}

pub fn get_stagenode_dir() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    Path::new(&home).join(".stagenode")
}

pub fn get_settings_file_path() -> PathBuf {
    get_stagenode_dir().join("settings.json")
}

pub fn read_git_config_value(key: &str) -> Option<String> {
    let output = Command::new("git")
        .args(&["config", "--global", key])
        .output()
        .ok()?;
    if output.status.success() {
        let val = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !val.is_empty() {
            return Some(val);
        }
    }
    None
}

pub fn set_git_config_value(key: &str, value: &str) -> Result<(), String> {
    let status = Command::new("git")
        .args(&["config", "--global", key, value])
        .status()
        .map_err(|e| format!("Failed to run git config: {}", e))?;
    if !status.success() {
        return Err(format!("git config exited with status: {}", status));
    }
    Ok(())
}

pub fn get_system_git_config_impl() -> SystemGitConfig {
    SystemGitConfig {
        user_name: read_git_config_value("user.name"),
        user_email: read_git_config_value("user.email"),
        default_branch: read_git_config_value("init.defaultBranch"),
        excludes_file: read_git_config_value("core.excludesfile"),
    }
}

pub fn get_global_settings_impl() -> Result<GlobalSettings, String> {
    let file_path = get_settings_file_path();
    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read settings file: {}", e))?;
        let mut settings: GlobalSettings = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings file: {}", e))?;
        
        // If git settings were never configured in stagenode, check system git config
        let sys = get_system_git_config_impl();
        if settings.git_user_name.is_none() || settings.git_user_name.as_deref() == Some("") {
            settings.git_user_name = sys.user_name;
        }
        if settings.git_user_email.is_none() || settings.git_user_email.as_deref() == Some("") {
            settings.git_user_email = sys.user_email;
        }
        if settings.git_default_branch.is_none() || settings.git_default_branch.as_deref() == Some("") {
            settings.git_default_branch = sys.default_branch.or(Some("main".to_string()));
        }
        if settings.global_gitignore_path.is_none() || settings.global_gitignore_path.as_deref() == Some("") {
            settings.global_gitignore_path = sys.excludes_file.or(Some("~/.gitignore_global".to_string()));
        }
        if settings.ai_provider.is_none() {
            settings.ai_provider = Some("gemini".to_string());
        }
        if settings.gemini_model.is_none() {
            settings.gemini_model = Some("gemini-2.5-flash".to_string());
        }
        if settings.openai_model.is_none() {
            settings.openai_model = Some("gpt-4o".to_string());
        }
        if settings.sync_git_global_config.is_none() {
            settings.sync_git_global_config = Some(true);
        }

        Ok(settings)
    } else {
        let sys = get_system_git_config_impl();
        let default_settings = GlobalSettings {
            git_user_name: sys.user_name,
            git_user_email: sys.user_email,
            git_default_branch: sys.default_branch.or(Some("main".to_string())),
            global_gitignore_path: sys.excludes_file.or(Some("~/.gitignore_global".to_string())),
            sync_git_global_config: Some(true),
            ai_provider: Some("gemini".to_string()),
            gemini_api_key: None,
            gemini_model: Some("gemini-2.5-flash".to_string()),
            openai_api_key: None,
            openai_model: Some("gpt-4o".to_string()),
            openai_base_url: None,
        };

        // Attempt initial save
        let _ = save_global_settings_impl(&default_settings);
        Ok(default_settings)
    }
}

pub fn save_global_settings_impl(settings: &GlobalSettings) -> Result<GlobalSettings, String> {
    let dir = get_stagenode_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let file_path = get_settings_file_path();
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;

    // If sync with git global config is enabled
    if settings.sync_git_global_config.unwrap_or(true) {
        if let Some(ref name) = settings.git_user_name {
            if !name.trim().is_empty() {
                let _ = set_git_config_value("user.name", name.trim());
            }
        }
        if let Some(ref email) = settings.git_user_email {
            if !email.trim().is_empty() {
                let _ = set_git_config_value("user.email", email.trim());
            }
        }
        if let Some(ref branch) = settings.git_default_branch {
            if !branch.trim().is_empty() {
                let _ = set_git_config_value("init.defaultBranch", branch.trim());
            }
        }
        if let Some(ref ignore_path) = settings.global_gitignore_path {
            if !ignore_path.trim().is_empty() {
                let _ = set_git_config_value("core.excludesfile", ignore_path.trim());
            }
        }
    }

    Ok(settings.clone())
}

pub fn read_file_content_impl(path: &str) -> Result<String, String> {
    let resolved = expand_tilde(path.trim());
    if !resolved.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&resolved)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}

pub fn write_file_content_impl(path: &str, content: &str) -> Result<(), String> {
    let resolved = expand_tilde(path.trim());
    if let Some(parent) = resolved.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory for {}: {}", path, e))?;
        }
    }
    fs::write(&resolved, content)
        .map_err(|e| format!("Failed to write file {}: {}", path, e))
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct WorkspaceSettings {
    pub repo_path: String,
    pub remote_url: Option<String>,
    pub local_user_name: Option<String>,
    pub local_user_email: Option<String>,
    pub has_local_identity: bool,
    pub gitignore_exists: bool,
}

pub fn get_workspace_settings_impl(repo_path: &str) -> Result<WorkspaceSettings, String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository at {}: {}", repo_path, e))?;

    let config = repo.config().ok();

    let local_user_name = config.as_ref().and_then(|c| {
        c.get_entry("user.name").ok().and_then(|entry| {
            if entry.level() == git2::ConfigLevel::Local {
                entry.value().map(|s| s.to_string())
            } else {
                None
            }
        })
    });

    let local_user_email = config.as_ref().and_then(|c| {
        c.get_entry("user.email").ok().and_then(|entry| {
            if entry.level() == git2::ConfigLevel::Local {
                entry.value().map(|s| s.to_string())
            } else {
                None
            }
        })
    });

    let remote_url = repo.find_remote("origin").ok().and_then(|r| r.url().map(|s| s.to_string()));
    let gitignore_path = Path::new(repo_path).join(".gitignore");

    Ok(WorkspaceSettings {
        repo_path: repo_path.to_string(),
        remote_url,
        local_user_name: local_user_name.clone(),
        local_user_email: local_user_email.clone(),
        has_local_identity: local_user_name.is_some() || local_user_email.is_some(),
        gitignore_exists: gitignore_path.exists(),
    })
}

pub fn save_workspace_settings_impl(
    repo_path: &str,
    remote_url: Option<String>,
    local_user_name: Option<String>,
    local_user_email: Option<String>,
) -> Result<WorkspaceSettings, String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository at {}: {}", repo_path, e))?;

    // 1. Update Remote URL
    if let Some(new_url) = remote_url {
        let trimmed = new_url.trim();
        if !trimmed.is_empty() {
            if repo.find_remote("origin").is_ok() {
                repo.remote_set_url("origin", trimmed)
                    .map_err(|e| format!("Failed to set remote origin URL: {}", e))?;
            } else {
                repo.remote("origin", trimmed)
                    .map_err(|e| format!("Failed to add remote origin: {}", e))?;
            }
        }
    }

    // 2. Local user.name and user.email in repo config
    if let Ok(mut config) = repo.config() {
        if let Some(name) = local_user_name {
            let trimmed = name.trim();
            if !trimmed.is_empty() {
                let _ = config.set_str("user.name", trimmed);
            } else {
                let _ = config.remove("user.name");
            }
        }
        if let Some(email) = local_user_email {
            let trimmed = email.trim();
            if !trimmed.is_empty() {
                let _ = config.set_str("user.email", trimmed);
            } else {
                let _ = config.remove("user.email");
            }
        }
    }

    get_workspace_settings_impl(repo_path)
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expand_tilde() {
        let path = "~/test_file.txt";
        let expanded = expand_tilde(path);
        assert!(!expanded.to_string_lossy().starts_with("~"));
        assert!(expanded.to_string_lossy().ends_with("test_file.txt"));

        let non_tilde = "/absolute/path/test.txt";
        let non_expanded = expand_tilde(non_tilde);
        assert_eq!(non_expanded, PathBuf::from(non_tilde));
    }

    #[test]
    fn test_settings_serialization() {
        let settings = GlobalSettings {
            git_user_name: Some("Test User".into()),
            git_user_email: Some("test@example.com".into()),
            git_default_branch: Some("main".into()),
            global_gitignore_path: Some("~/.gitignore_global".into()),
            sync_git_global_config: Some(false),
            ai_provider: Some("gemini".into()),
            gemini_api_key: Some("test_key".into()),
            gemini_model: Some("gemini-2.5-flash".into()),
            openai_api_key: None,
            openai_model: Some("gpt-4o".into()),
            openai_base_url: None,
        };

        let json = serde_json::to_string(&settings).expect("Serialization failed");
        let deserialized: GlobalSettings = serde_json::from_str(&json).expect("Deserialization failed");

        assert_eq!(deserialized.git_user_name, Some("Test User".into()));
        assert_eq!(deserialized.ai_provider, Some("gemini".into()));
        assert_eq!(deserialized.gemini_api_key, Some("test_key".into()));
    }
}

