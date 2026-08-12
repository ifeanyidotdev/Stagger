use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitFileStatus {
    pub path: String,
    pub staged_status: Option<String>,
    pub unstaged_status: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitStatusResult {
    pub files: Vec<GitFileStatus>,
    pub current_branch: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CommitInfo {
    pub id: String,
    pub short_id: String,
    pub author: String,
    pub email: String,
    pub timestamp: i64,
    pub message: String,
    pub parents: Vec<String>,
    pub branches: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiffLine {
    pub origin: char,
    pub content: String,
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiffInfo {
    pub hunks: Vec<DiffHunk>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitCliResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BranchInfo {
    pub name: String,
    pub is_remote: bool,
    pub upstream: Option<String>,
}

pub fn parse_file_status(status: git2::Status) -> (Option<String>, Option<String>) {
    let mut staged = None;
    let mut unstaged = None;

    if status.is_conflicted() {
        return (Some("Conflict".to_string()), Some("Conflict".to_string()));
    }

    if status.is_index_new() {
        staged = Some("Added".to_string());
    } else if status.is_index_modified() {
        staged = Some("Modified".to_string());
    } else if status.is_index_deleted() {
        staged = Some("Deleted".to_string());
    } else if status.is_index_renamed() {
        staged = Some("Renamed".to_string());
    } else if status.is_index_typechange() {
        staged = Some("Typechange".to_string());
    }

    if status.is_wt_new() {
        unstaged = Some("Untracked".to_string());
    } else if status.is_wt_modified() {
        unstaged = Some("Modified".to_string());
    } else if status.is_wt_deleted() {
        unstaged = Some("Deleted".to_string());
    } else if status.is_wt_renamed() {
        unstaged = Some("Renamed".to_string());
    } else if status.is_wt_typechange() {
        unstaged = Some("Typechange".to_string());
    }

    (staged, unstaged)
}

pub fn get_git_status_impl(repo_path: &str) -> Result<GitStatusResult, String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let current_branch = match repo.find_reference("HEAD") {
        Ok(head_ref) => {
            if let Some(target) = head_ref.symbolic_target() {
                target.strip_prefix("refs/heads/").unwrap_or(target).to_string()
            } else {
                "HEAD".to_string()
            }
        }
        Err(_) => match repo.head() {
            Ok(head) => head.shorthand().unwrap_or("HEAD").to_string(),
            Err(_) => "Main".to_string(),
        }
    };

    let mut status_options = git2::StatusOptions::new();
    status_options.include_untracked(true);
    status_options.recurse_untracked_dirs(true);

    let statuses = repo.statuses(Some(&mut status_options))
        .map_err(|e| format!("Failed to get repository status: {}", e))?;

    let mut files = Vec::new();
    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let (staged_status, unstaged_status) = parse_file_status(entry.status());
        if staged_status.is_some() || unstaged_status.is_some() {
            files.push(GitFileStatus {
                path,
                staged_status,
                unstaged_status,
            });
        }
    }

    Ok(GitStatusResult { files, current_branch })
}

pub fn get_git_log_impl(repo_path: &str, limit: Option<usize>) -> Result<Vec<CommitInfo>, String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut revwalk = repo.revwalk()
        .map_err(|e| format!("Failed to initialize revwalk: {}", e))?;
    
    // Push all references (heads, remotes, tags, stashes) and HEAD
    revwalk.push_glob("refs/*").ok();
    revwalk.push_head().ok();

    // Include stashes in revwalk
    if let Ok(reflog) = repo.reflog("refs/stash") {
        for entry in reflog.iter() {
            revwalk.push(entry.id_new()).ok();
        }
    }

    revwalk.set_sorting(git2::Sort::TOPOLOGICAL | git2::Sort::TIME).ok();

    let mut commit_branches: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();

    // Map all references (local branches, remote branches, tags)
    if let Ok(references) = repo.references() {
        for reference_res in references {
            if let Ok(reference) = reference_res {
                if let (Some(name), Some(target)) = (reference.name(), reference.target()) {
                    let clean_name = if name.starts_with("refs/heads/") {
                        name.strip_prefix("refs/heads/").unwrap_or(name).to_string()
                    } else if name.starts_with("refs/remotes/") {
                        name.strip_prefix("refs/remotes/").unwrap_or(name).to_string()
                    } else if name.starts_with("refs/tags/") {
                        format!("tag: {}", name.strip_prefix("refs/tags/").unwrap_or(name))
                    } else if name.starts_with("refs/stash") {
                        "stash".to_string()
                    } else {
                        name.to_string()
                    };

                    if clean_name != "HEAD" && !clean_name.starts_with("HEAD ") && !clean_name.contains("detached") {
                        let entries = commit_branches.entry(target.to_string()).or_default();
                        if !entries.contains(&clean_name) {
                            entries.push(clean_name);
                        }
                    }
                }
            }
        }
    }

    // Map stashes with indices (stash@{0}, stash@{1}, etc.)
    if let Ok(reflog) = repo.reflog("refs/stash") {
        for (i, entry) in reflog.iter().enumerate() {
            let target = entry.id_new().to_string();
            let label = format!("stash@{{{}}}", i);
            let entries = commit_branches.entry(target).or_default();
            if !entries.contains(&label) {
                entries.push(label);
            }
        }
    }

    let mut commits = Vec::new();
    let max_commits = limit.unwrap_or(2000);

    for oid_res in revwalk {
        if commits.len() >= max_commits {
            break;
        }

        if let Ok(oid) = oid_res {
            if let Ok(commit) = repo.find_commit(oid) {
                let id = commit.id().to_string();
                let short_id = commit.id().to_string()[..7].to_string();
                let author = commit.author().name().unwrap_or("Unknown").to_string();
                let email = commit.author().email().unwrap_or("").to_string();
                let timestamp = commit.time().seconds();
                let message = commit.message().unwrap_or("").trim().to_string();

                let mut parents = Vec::new();
                for parent in commit.parents() {
                    parents.push(parent.id().to_string());
                }

                let branches = commit_branches.get(&id).cloned().unwrap_or_default();

                commits.push(CommitInfo {
                    id,
                    short_id,
                    author,
                    email,
                    timestamp,
                    message,
                    parents,
                    branches,
                });
            }
        }
    }

    Ok(commits)
}

pub fn get_file_diff_impl(repo_path: &str, file_path: &str, staged: bool) -> Result<DiffInfo, String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut diff_opts = git2::DiffOptions::new();
    diff_opts.pathspec(file_path);
    diff_opts.disable_pathspec_match(false);

    let diff = if staged {
        let head_tree = match repo.head() {
            Ok(head) => Some(head.peel_to_tree().map_err(|e| format!("Failed to get HEAD tree: {}", e))?),
            Err(_) => None,
        };
        let index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;
        repo.diff_tree_to_index(head_tree.as_ref(), Some(&index), Some(&mut diff_opts))
            .map_err(|e| format!("Failed to generate staged diff: {}", e))?
    } else {
        let index = repo.index().ok();
        repo.diff_index_to_workdir(index.as_ref(), Some(&mut diff_opts))
            .map_err(|e| format!("Failed to generate unstaged diff: {}", e))?
    };

    let mut hunks = Vec::new();
    let mut current_hunk: Option<DiffHunk> = None;

    diff.print(git2::DiffFormat::Patch, |_delta, hunk, line| {
        let origin = line.origin();
        if origin == 'H' {
            if let Some(h) = current_hunk.take() {
                hunks.push(h);
            }
            
            let (header, old_start, old_lines, new_start, new_lines) = if let Some(ref h) = hunk {
                let header_str = std::str::from_utf8(h.header())
                    .unwrap_or("")
                    .trim_end()
                    .to_string();
                (header_str, h.old_start(), h.old_lines(), h.new_start(), h.new_lines())
            } else {
                ("".to_string(), 0, 0, 0, 0)
            };

            current_hunk = Some(DiffHunk {
                old_start,
                old_lines,
                new_start,
                new_lines,
                header,
                lines: Vec::new(),
            });
        } else if let Some(ref mut h) = current_hunk {
            let content = std::str::from_utf8(line.content())
                .unwrap_or("")
                .to_string();

            h.lines.push(DiffLine {
                origin,
                content,
                old_line_no: line.old_lineno(),
                new_line_no: line.new_lineno(),
            });
        }
        true
    })
    .map_err(|e| format!("Error printing diff: {}", e))?;

    if let Some(h) = current_hunk {
        hunks.push(h);
    }

    Ok(DiffInfo { hunks })
}

pub fn stage_file_impl(repo_path: &str, file_path: &str) -> Result<(), String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    let mut index = repo.index().map_err(|e| format!("Failed to open index: {}", e))?;
    
    index.add_path(Path::new(file_path))
        .map_err(|e| format!("Failed to add file to index: {}", e))?;
    index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    Ok(())
}

pub fn unstage_file_impl(repo_path: &str, file_path: &str) -> Result<(), String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let head = repo.head().ok();
    if let Some(head_ref) = head {
        let commit = head_ref.peel_to_commit().map_err(|e| format!("HEAD is not a commit: {}", e))?;
        let obj = commit.into_object();
        repo.reset_default(Some(&obj), vec![file_path])
            .map_err(|e| format!("Failed to unstage file: {}", e))?;
    } else {
        let mut index = repo.index().map_err(|e| format!("Failed to open index: {}", e))?;
        index.remove_path(Path::new(file_path))
            .map_err(|e| format!("Failed to remove file from index: {}", e))?;
        index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    }
    Ok(())
}

pub fn apply_patch_to_index_impl(repo_path: &str, patch_content: &str) -> Result<GitCliResult, String> {
    use std::io::Write;
    use std::process::Stdio;
    
    let mut child = Command::new("git")
        .args(&["apply", "--cached", "-"])
        .current_dir(Path::new(repo_path))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn git apply: {}", e))?;

    {
        let stdin = child.stdin.as_mut().ok_or("Failed to open stdin")?;
        stdin.write_all(patch_content.as_bytes())
            .map_err(|e| format!("Failed to write patch to stdin: {}", e))?;
    }

    let output = child.wait_with_output()
        .map_err(|e| format!("Failed to wait for git apply: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok(GitCliResult {
        stdout,
        stderr,
        exit_code,
    })
}

pub fn run_git_cli_cmd_impl(repo_path: &str, args: &[String]) -> Result<GitCliResult, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(Path::new(repo_path))
        .output()
        .map_err(|e| format!("Failed to execute Git CLI: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok(GitCliResult {
        stdout,
        stderr,
        exit_code,
    })
}

pub fn get_branches_impl(repo_path: &str) -> Result<Vec<String>, String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    let branches = match repo.branches(Some(git2::BranchType::Local)) {
        Ok(b) => b,
        Err(_) => return Ok(Vec::new()),
    };
    let mut branch_names = Vec::new();
    for branch_res in branches {
        if let Ok((branch, _)) = branch_res {
            if let Ok(Some(name)) = branch.name() {
                if name != "HEAD" && !name.starts_with("HEAD ") && !name.contains("detached") {
                    branch_names.push(name.to_string());
                }
            }
        }
    }
    Ok(branch_names)
}

pub fn get_all_branches_impl(repo_path: &str) -> Result<Vec<BranchInfo>, String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut result = Vec::new();

    if let Ok(branches) = repo.branches(Some(git2::BranchType::Local)) {
        for branch_res in branches {
            if let Ok((branch, _)) = branch_res {
                if let Ok(Some(name)) = branch.name() {
                    if name != "HEAD" && !name.starts_with("HEAD ") && !name.contains("detached") {
                        let upstream_name = branch.upstream().ok()
                            .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));
                        
                        result.push(BranchInfo {
                            name: name.to_string(),
                            is_remote: false,
                            upstream: upstream_name,
                        });
                    }
                }
            }
        }
    }

    if let Ok(branches) = repo.branches(Some(git2::BranchType::Remote)) {
        for branch_res in branches {
            if let Ok((branch, _)) = branch_res {
                if let Ok(Some(name)) = branch.name() {
                    if !name.ends_with("/HEAD") {
                        result.push(BranchInfo {
                            name: name.to_string(),
                            is_remote: true,
                            upstream: None,
                        });
                    }
                }
            }
        }
    }

    Ok(result)
}

pub fn stage_files_impl(repo_path: &str, file_paths: Vec<String>) -> Result<(), String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    let mut index = repo.index().map_err(|e| format!("Failed to open index: {}", e))?;
    
    let workdir = repo.workdir().ok_or("Failed to get repository working directory")?;
    for file_path in file_paths {
        let full_path = workdir.join(&file_path);
        if full_path.exists() {
            index.add_path(Path::new(&file_path))
                .map_err(|e| format!("Failed to add file {} to index: {}", file_path, e))?;
        } else {
            index.remove_path(Path::new(&file_path))
                .map_err(|e| format!("Failed to remove file {} from index: {}", file_path, e))?;
        }
    }
    index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    Ok(())
}

pub fn unstage_files_impl(repo_path: &str, file_paths: Vec<String>) -> Result<(), String> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let head = repo.head().ok();
    if let Some(head_ref) = head {
        let commit = head_ref.peel_to_commit().map_err(|e| format!("HEAD is not a commit: {}", e))?;
        let obj = commit.into_object();
        repo.reset_default(Some(&obj), file_paths)
            .map_err(|e| format!("Failed to unstage files: {}", e))?;
    } else {
        let mut index = repo.index().map_err(|e| format!("Failed to open index: {}", e))?;
        for file_path in file_paths {
            index.remove_path(Path::new(&file_path))
                .map_err(|e| format!("Failed to remove file {} from index: {}", file_path, e))?;
        }
        index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    }
    Ok(())
}


