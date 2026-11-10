use serde::{Deserialize, Serialize};
use std::process::Command;
use std::net::TcpListener;
use std::io::{Read, Write};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrUser {
    pub login: String,
    pub avatar_url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrBranchRef {
    #[serde(rename = "ref")]
    pub ref_name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PullRequestResult {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub draft: Option<bool>,
    pub html_url: String,
    pub user: Option<PrUser>,
    pub head: PrBranchRef,
    pub base: PrBranchRef,
    pub provider: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreatePullRequestPayload {
    pub provider: String, // "github" | "gitlab" | "bitbucket" | "gitea"
    pub host_url: String,
    pub owner: String,
    pub repo: String,
    pub full_path: String,
    pub token: String,
    pub bitbucket_username: Option<String>,
    pub title: String,
    pub body: String,
    pub head: String,
    pub base: String,
    pub draft: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FetchPullRequestsPayload {
    pub provider: String,
    pub host_url: String,
    pub owner: String,
    pub repo: String,
    pub full_path: String,
    pub token: String,
    pub bitbucket_username: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PullRequestComment {
    pub id: u64,
    pub user: Option<PrUser>,
    pub body: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PullRequestCommitItem {
    pub sha: String,
    pub message: String,
    pub author: String,
    pub date: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PullRequestFileItem {
    pub filename: String,
    pub status: String,
    pub additions: u64,
    pub deletions: u64,
    pub changes: u64,
    pub patch: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PullRequestDetailResult {
    pub number: u64,
    pub title: String,
    pub body: Option<String>,
    pub state: String,
    pub draft: Option<bool>,
    pub merged: bool,
    pub mergeable: Option<bool>,
    pub mergeable_state: Option<String>,
    pub html_url: String,
    pub user: Option<PrUser>,
    pub head_ref: String,
    pub head_sha: String,
    pub base_ref: String,
    pub base_sha: String,
    pub created_at: String,
    pub updated_at: String,
    pub comments: Vec<PullRequestComment>,
    pub commits: Vec<PullRequestCommitItem>,
    pub files: Vec<PullRequestFileItem>,
    pub total_additions: u64,
    pub total_deletions: u64,
    pub provider: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PullRequestDetailPayload {
    pub provider: String,
    pub host_url: String,
    pub owner: String,
    pub repo: String,
    pub full_path: String,
    pub token: String,
    pub pr_number: u64,
    pub bitbucket_username: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PostCommentPayload {
    pub provider: String,
    pub host_url: String,
    pub owner: String,
    pub repo: String,
    pub full_path: String,
    pub token: String,
    pub pr_number: u64,
    pub body: String,
    pub bitbucket_username: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MergePullRequestPayload {
    pub provider: String,
    pub host_url: String,
    pub owner: String,
    pub repo: String,
    pub full_path: String,
    pub token: String,
    pub pr_number: u64,
    pub merge_method: String,
    pub commit_title: Option<String>,
    pub commit_message: Option<String>,
    pub bitbucket_username: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdatePullRequestStatePayload {
    pub provider: String,
    pub host_url: String,
    pub owner: String,
    pub repo: String,
    pub full_path: String,
    pub token: String,
    pub pr_number: u64,
    pub state: String,
    pub bitbucket_username: Option<String>,
}

pub fn login_with_github_impl() -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:54321")
        .map_err(|e| format!("Failed to bind local OAuth server: {}", e))?;

    if let Ok((mut stream, _)) = listener.accept() {
        stream.set_read_timeout(Some(std::time::Duration::from_secs(300))).ok();
        let mut buffer = [0; 1024];
        if let Ok(size) = stream.read(&mut buffer) {
            let request = String::from_utf8_lossy(&buffer[..size]);
            if let Some(code_pos) = request.find("code=") {
                let code_start = code_pos + 5;
                let code_end = request[code_start..].find('&')
                    .or_else(|| request[code_start..].find(' '))
                    .map(|end| code_start + end)
                    .unwrap_or(request.len());
                let code = request[code_start..code_end].to_string();

                let html_response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n\
                    <html>\
                    <head>\
                      <title>Stagger Authentication</title>\
                      <style>\
                        body { font-family: -apple-system, sans-serif; background: #080c14; color: #f8fafc; text-align: center; padding-top: 80px; }\
                        h1 { color: #6366f1; margin-bottom: 16px; font-weight: 700; }\
                        p { color: #94a3b8; font-size: 1.1rem; }\
                      </style>\
                    </head>\
                    <body>\
                      <h1>Stagger Connected</h1>\
                      <p>GitHub authentication code received. You can now close this tab and return to the application.</p>\
                    </body>\
                    </html>";
                let _ = stream.write_all(html_response.as_bytes());
                return Ok(code);
            }
        }
    }
    Err("OAuth login callback timeout or invalid request".to_string())
}

pub fn request_github_token_impl(
    client_id: &str,
    client_secret: &str,
    code: &str,
) -> Result<String, String> {
    let mut cmd = Command::new("curl");
    cmd.arg("-s")
       .arg("-X")
       .arg("POST")
       .arg("-H")
       .arg("Accept: application/json")
       .arg("-d")
       .arg(format!(
           "client_id={}&client_secret={}&code={}",
           client_id, client_secret, code
       ))
       .arg("https://github.com/login/oauth/access_token");

    let output = cmd.output()
        .map_err(|e| format!("Failed to contact GitHub: {}", e))?;

    let response = String::from_utf8_lossy(&output.stdout).to_string();
    if output.status.success() {
        Ok(response)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("GitHub exchange rejected: {} - {}", response, err))
    }
}

pub fn run_github_api_request_impl(
    token: &str,
    path: &str,
    method: &str,
    body: Option<&str>,
) -> Result<String, String> {
    let url = format!("https://api.github.com{}", path);
    let mut cmd = Command::new("curl");
    cmd.arg("-s")
       .arg("-X")
       .arg(method)
       .arg("-H")
       .arg(format!("Authorization: token {}", token))
       .arg("-H")
       .arg("Accept: application/vnd.github.v3+json")
       .arg("-H")
       .arg("User-Agent: Stagger-App");

    if let Some(b) = body {
        cmd.arg("-d").arg(b);
    }
    cmd.arg(&url);

    let output = cmd.output()
        .map_err(|e| format!("Failed to contact API: {}", e))?;

    let response = String::from_utf8_lossy(&output.stdout).to_string();
    if output.status.success() {
        Ok(response)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("GitHub API call failed: {} - {}", response, err))
    }
}

fn url_encode_component(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len() * 2);
    for b in input.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(b as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", b));
            }
        }
    }
    encoded
}

fn normalize_host(host_url: &str, default_host: &str) -> String {
    let trimmed = host_url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return default_host.to_string();
    }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    }
}

fn parse_pr_from_json(val: &serde_json::Value, provider: &str) -> Option<PullRequestResult> {
    match provider {
        "gitlab" => {
            let number = val.get("iid").and_then(|v| v.as_u64())?;
            let title = val.get("title").and_then(|v| v.as_str())?.to_string();
            let state = val.get("state").and_then(|v| v.as_str()).unwrap_or("opened").to_string();
            let html_url = val.get("web_url").and_then(|v| v.as_str())?.to_string();
            let draft = val.get("draft").and_then(|v| v.as_bool()).or_else(|| {
                val.get("work_in_progress").and_then(|v| v.as_bool())
            });
            let head_ref = val.get("source_branch").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let base_ref = val.get("target_branch").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let user = val.get("author").and_then(|a| {
                let login = a.get("username").or_else(|| a.get("name")).and_then(|v| v.as_str())?.to_string();
                let avatar_url = a.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });
            Some(PullRequestResult {
                number,
                title,
                state,
                draft,
                html_url,
                user,
                head: PrBranchRef { ref_name: head_ref },
                base: PrBranchRef { ref_name: base_ref },
                provider: "gitlab".to_string(),
            })
        }
        "bitbucket" => {
            let number = val.get("id").and_then(|v| v.as_u64())?;
            let title = val.get("title").and_then(|v| v.as_str())?.to_string();
            let state = val.get("state").and_then(|v| v.as_str()).unwrap_or("OPEN").to_string();
            let html_url = val
                .get("links")
                .and_then(|l| l.get("html"))
                .and_then(|h| h.get("href"))
                .and_then(|v| v.as_str())?
                .to_string();
            let head_ref = val
                .get("source")
                .and_then(|s| s.get("branch"))
                .and_then(|b| b.get("name"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let base_ref = val
                .get("destination")
                .and_then(|s| s.get("branch"))
                .and_then(|b| b.get("name"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let user = val.get("author").and_then(|a| {
                let login = a.get("nickname").or_else(|| a.get("display_name")).and_then(|v| v.as_str())?.to_string();
                let avatar_url = a
                    .get("links")
                    .and_then(|l| l.get("avatar"))
                    .and_then(|av| av.get("href"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });
            Some(PullRequestResult {
                number,
                title,
                state,
                draft: Some(false),
                html_url,
                user,
                head: PrBranchRef { ref_name: head_ref },
                base: PrBranchRef { ref_name: base_ref },
                provider: "bitbucket".to_string(),
            })
        }
        _ => {
            // GitHub and Gitea/Forgejo share standard GitHub v3 PR schema
            let number = val.get("number").and_then(|v| v.as_u64())?;
            let title = val.get("title").and_then(|v| v.as_str())?.to_string();
            let state = val.get("state").and_then(|v| v.as_str()).unwrap_or("open").to_string();
            let html_url = val.get("html_url").and_then(|v| v.as_str())?.to_string();
            let draft = val.get("draft").and_then(|v| v.as_bool());
            let head_ref = val
                .get("head")
                .and_then(|h| h.get("ref"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let base_ref = val
                .get("base")
                .and_then(|b| b.get("ref"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let user = val.get("user").and_then(|u| {
                let login = u.get("login").and_then(|v| v.as_str())?.to_string();
                let avatar_url = u.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });
            Some(PullRequestResult {
                number,
                title,
                state,
                draft,
                html_url,
                user,
                head: PrBranchRef { ref_name: head_ref },
                base: PrBranchRef { ref_name: base_ref },
                provider: provider.to_string(),
            })
        }
    }
}

pub fn create_pull_request_impl(payload: &CreatePullRequestPayload) -> Result<PullRequestResult, String> {
    let provider = payload.provider.trim().to_lowercase();
    let token = payload.token.trim();
    if token.is_empty() {
        return Err("Missing access token for provider. Please configure your Personal Access Token in Settings.".to_string());
    }

    let mut cmd = Command::new("curl");
    cmd.arg("-s").arg("-X").arg("POST");
    cmd.arg("-H").arg("Content-Type: application/json");
    cmd.arg("-H").arg("User-Agent: Stagger-App");

    let url: String;
    let body_json: serde_json::Value;

    match provider.as_str() {
        "gitlab" => {
            let host = normalize_host(&payload.host_url, "https://gitlab.com");
            let project_path = if !payload.full_path.trim().is_empty() {
                payload.full_path.trim().to_string()
            } else {
                format!("{}/{}", payload.owner.trim(), payload.repo.trim())
            };
            let encoded_project = url_encode_component(&project_path);
            url = format!("{}/api/v4/projects/{}/merge_requests", host, encoded_project);
            cmd.arg("-H").arg(format!("PRIVATE-TOKEN: {}", token));

            let final_title = if payload.draft
                && !payload.title.trim_start().to_lowercase().starts_with("draft:")
                && !payload.title.trim_start().to_lowercase().starts_with("wip:")
            {
                format!("Draft: {}", payload.title.trim())
            } else {
                payload.title.trim().to_string()
            };

            body_json = serde_json::json!({
                "source_branch": payload.head,
                "target_branch": payload.base,
                "title": final_title,
                "description": payload.body
            });
        }
        "bitbucket" => {
            url = format!(
                "https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests",
                payload.owner.trim(),
                payload.repo.trim()
            );
            if let Some(ref username) = payload.bitbucket_username {
                if !username.trim().is_empty() {
                    cmd.arg("-u").arg(format!("{}:{}", username.trim(), token));
                } else {
                    cmd.arg("-H").arg(format!("Authorization: Bearer {}", token));
                }
            } else {
                cmd.arg("-H").arg(format!("Authorization: Bearer {}", token));
            }

            body_json = serde_json::json!({
                "title": payload.title.trim(),
                "description": payload.body,
                "source": {
                    "branch": {
                        "name": payload.head
                    }
                },
                "destination": {
                    "branch": {
                        "name": payload.base
                    }
                }
            });
        }
        "gitea" => {
            let host = normalize_host(&payload.host_url, "https://codeberg.org");
            url = format!(
                "{}/api/v1/repos/{}/{}/pulls",
                host,
                payload.owner.trim(),
                payload.repo.trim()
            );
            cmd.arg("-H").arg(format!("Authorization: token {}", token));

            let final_title = if payload.draft
                && !payload.title.trim_start().to_lowercase().starts_with("wip:")
                && !payload.title.trim_start().to_lowercase().starts_with("draft:")
            {
                format!("WIP: {}", payload.title.trim())
            } else {
                payload.title.trim().to_string()
            };

            body_json = serde_json::json!({
                "title": final_title,
                "body": payload.body,
                "head": payload.head,
                "base": payload.base
            });
        }
        _ => {
            // Default: GitHub (Cloud or Enterprise)
            let host = normalize_host(&payload.host_url, "https://github.com");
            let api_base = if host == "https://github.com" || host == "http://github.com" {
                "https://api.github.com".to_string()
            } else {
                format!("{}/api/v3", host)
            };
            url = format!(
                "{}/repos/{}/{}/pulls",
                api_base,
                payload.owner.trim(),
                payload.repo.trim()
            );
            cmd.arg("-H").arg(format!("Authorization: Bearer {}", token));
            cmd.arg("-H").arg("Accept: application/vnd.github+json");

            body_json = serde_json::json!({
                "title": payload.title.trim(),
                "body": payload.body,
                "head": payload.head,
                "base": payload.base,
                "draft": payload.draft
            });
        }
    }

    let body_str = serde_json::to_string(&body_json)
        .map_err(|e| format!("Failed to serialize request body: {}", e))?;
    cmd.arg("-d").arg(&body_str).arg(&url);

    let output = cmd.output().map_err(|e| format!("Failed to execute API request: {}", e))?;
    let response_text = String::from_utf8_lossy(&output.stdout).to_string();

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Network error contacting {}: {}", url, stderr));
    }

    let parsed: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|_| format!("Invalid JSON response from provider: {}", response_text))?;

    if let Some(pr) = parse_pr_from_json(&parsed, &provider) {
        Ok(pr)
    } else {
        // Extract readable error message from GitHub/GitLab/Bitbucket response
        let err_msg = parsed
            .get("message")
            .and_then(|v| v.as_str())
            .map(|m| {
                if let Some(errors) = parsed.get("errors").and_then(|e| e.as_array()) {
                    let details: Vec<String> = errors
                        .iter()
                        .filter_map(|item| {
                            item.get("message")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                                .or_else(|| item.as_str().map(|s| s.to_string()))
                        })
                        .collect();
                    if !details.is_empty() {
                        return format!("{} ({})", m, details.join("; "));
                    }
                }
                m.to_string()
            })
            .or_else(|| {
                parsed
                    .get("error")
                    .and_then(|e| e.get("message").or(Some(e)))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| response_text.clone());

        Err(format!("Failed to create PR/MR: {}", err_msg))
    }
}

pub fn fetch_pull_requests_impl(payload: &FetchPullRequestsPayload) -> Result<Vec<PullRequestResult>, String> {
    let provider = payload.provider.trim().to_lowercase();
    let token = payload.token.trim();
    if token.is_empty() {
        return Ok(Vec::new());
    }

    let mut cmd = Command::new("curl");
    cmd.arg("-s").arg("-X").arg("GET");
    cmd.arg("-H").arg("Accept: application/json");
    cmd.arg("-H").arg("User-Agent: Stagger-App");

    let url: String;

    match provider.as_str() {
        "gitlab" => {
            let host = normalize_host(&payload.host_url, "https://gitlab.com");
            let project_path = if !payload.full_path.trim().is_empty() {
                payload.full_path.trim().to_string()
            } else {
                format!("{}/{}", payload.owner.trim(), payload.repo.trim())
            };
            let encoded_project = url_encode_component(&project_path);
            url = format!(
                "{}/api/v4/projects/{}/merge_requests?state=opened&per_page=30",
                host, encoded_project
            );
            cmd.arg("-H").arg(format!("PRIVATE-TOKEN: {}", token));
        }
        "bitbucket" => {
            url = format!(
                "https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests?state=OPEN",
                payload.owner.trim(),
                payload.repo.trim()
            );
            if let Some(ref username) = payload.bitbucket_username {
                if !username.trim().is_empty() {
                    cmd.arg("-u").arg(format!("{}:{}", username.trim(), token));
                } else {
                    cmd.arg("-H").arg(format!("Authorization: Bearer {}", token));
                }
            } else {
                cmd.arg("-H").arg(format!("Authorization: Bearer {}", token));
            }
        }
        "gitea" => {
            let host = normalize_host(&payload.host_url, "https://codeberg.org");
            url = format!(
                "{}/api/v1/repos/{}/{}/pulls?state=open&limit=30",
                host,
                payload.owner.trim(),
                payload.repo.trim()
            );
            cmd.arg("-H").arg(format!("Authorization: token {}", token));
        }
        _ => {
            let host = normalize_host(&payload.host_url, "https://github.com");
            let api_base = if host == "https://github.com" || host == "http://github.com" {
                "https://api.github.com".to_string()
            } else {
                format!("{}/api/v3", host)
            };
            url = format!(
                "{}/repos/{}/{}/pulls?state=open&per_page=30",
                api_base,
                payload.owner.trim(),
                payload.repo.trim()
            );
            cmd.arg("-H").arg(format!("Authorization: Bearer {}", token));
            cmd.arg("-H").arg("Accept: application/vnd.github+json");
        }
    }

    cmd.arg(&url);
    let output = cmd.output().map_err(|e| format!("Failed to fetch PRs: {}", e))?;
    if !output.status.success() {
        return Ok(Vec::new());
    }

    let response_text = String::from_utf8_lossy(&output.stdout).to_string();
    let parsed: serde_json::Value = match serde_json::from_str(&response_text) {
        Ok(v) => v,
        Err(_) => return Ok(Vec::new()),
    };

    let items_array = if provider == "bitbucket" {
        parsed.get("values").and_then(|v| v.as_array())
    } else {
        parsed.as_array()
    };

    let mut results = Vec::new();
    if let Some(arr) = items_array {
        for item in arr {
            if let Some(pr) = parse_pr_from_json(item, &provider) {
                results.push(pr);
            }
        }
    }

    Ok(results)
}

fn make_auth_headers(provider: &str, token: &str, bitbucket_username: Option<&str>) -> Vec<(&'static str, String)> {
    match provider {
        "gitlab" => vec![
            ("PRIVATE-TOKEN", token.to_string()),
            ("Accept", "application/json".to_string()),
        ],
        "bitbucket" => {
            if let Some(user) = bitbucket_username {
                if !user.trim().is_empty() {
                    let auth = format!("{}:{}", user.trim(), token);
                    let encoded = url_encode_component(&auth); // or standard basic auth
                    return vec![
                        ("Authorization", format!("Basic {}", encoded)),
                        ("Accept", "application/json".to_string()),
                    ];
                }
            }
            vec![
                ("Authorization", format!("Bearer {}", token)),
                ("Accept", "application/json".to_string()),
            ]
        }
        "gitea" => vec![
            ("Authorization", format!("token {}", token)),
            ("Accept", "application/json".to_string()),
        ],
        _ => vec![
            ("Authorization", format!("Bearer {}", token)),
            ("Accept", "application/vnd.github+json".to_string()),
        ],
    }
}

fn execute_curl_json(
    url: &str,
    method: &str,
    headers: &[(&str, String)],
    body: Option<&str>,
) -> Result<serde_json::Value, String> {
    let mut cmd = Command::new("curl");
    cmd.arg("-s").arg("-X").arg(method);
    cmd.arg("-H").arg("User-Agent: Stagger-App");
    for (k, v) in headers {
        cmd.arg("-H").arg(format!("{}: {}", k, v));
    }
    if let Some(b) = body {
        cmd.arg("-d").arg(b);
    }
    cmd.arg(url);

    let output = cmd.output().map_err(|e| format!("Failed to contact provider: {}", e))?;
    let response_text = String::from_utf8_lossy(&output.stdout).to_string();

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Network error: {} - {}", response_text, stderr));
    }

    if response_text.trim().is_empty() {
        return Ok(serde_json::Value::Null);
    }

    serde_json::from_str(&response_text)
        .map_err(|_| format!("Invalid JSON response from provider: {}", response_text))
}

pub fn fetch_pull_request_details_impl(payload: &PullRequestDetailPayload) -> Result<PullRequestDetailResult, String> {
    let provider = payload.provider.trim().to_lowercase();
    let token = payload.token.trim();
    let num = payload.pr_number;
    let headers = make_auth_headers(&provider, token, payload.bitbucket_username.as_deref());

    match provider.as_str() {
        "gitlab" => {
            let host = normalize_host(&payload.host_url, "https://gitlab.com");
            let project_path = if !payload.full_path.trim().is_empty() {
                payload.full_path.trim().to_string()
            } else {
                format!("{}/{}", payload.owner.trim(), payload.repo.trim())
            };
            let encoded_project = url_encode_component(&project_path);
            let mr_url = format!("{}/api/v4/projects/{}/merge_requests/{}", host, encoded_project, num);
            let mr_json = execute_curl_json(&mr_url, "GET", &headers, None)?;

            let title = mr_json.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let body = mr_json.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
            let state_str = mr_json.get("state").and_then(|v| v.as_str()).unwrap_or("opened");
            let merged = state_str == "merged";
            let state = if merged { "merged".to_string() } else if state_str == "closed" { "closed".to_string() } else { "open".to_string() };
            let draft = mr_json.get("draft").and_then(|v| v.as_bool()).or_else(|| mr_json.get("work_in_progress").and_then(|v| v.as_bool()));
            let html_url = mr_json.get("web_url").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let head_ref = mr_json.get("source_branch").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let base_ref = mr_json.get("target_branch").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let head_sha = mr_json.get("sha").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let created_at = mr_json.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let updated_at = mr_json.get("updated_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let user = mr_json.get("author").and_then(|a| {
                let login = a.get("username").or_else(|| a.get("name")).and_then(|v| v.as_str())?.to_string();
                let avatar_url = a.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });

            // Fetch Notes/Comments
            let notes_url = format!("{}/api/v4/projects/{}/merge_requests/{}/notes?sort=asc", host, encoded_project, num);
            let notes_json = execute_curl_json(&notes_url, "GET", &headers, None).unwrap_or(serde_json::Value::Array(Vec::new()));
            let mut comments = Vec::new();
            if let Some(arr) = notes_json.as_array() {
                for n in arr {
                    let is_system = n.get("system").and_then(|v| v.as_bool()).unwrap_or(false);
                    if is_system { continue; }
                    let id = n.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let body = n.get("body").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let created_at = n.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let c_user = n.get("author").and_then(|a| {
                        let login = a.get("username").or_else(|| a.get("name")).and_then(|v| v.as_str())?.to_string();
                        let avatar_url = a.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                        Some(PrUser { login, avatar_url })
                    });
                    comments.push(PullRequestComment {
                        id,
                        user: c_user,
                        body,
                        created_at,
                        updated_at: None,
                    });
                }
            }

            // Fetch Commits
            let commits_url = format!("{}/api/v4/projects/{}/merge_requests/{}/commits", host, encoded_project, num);
            let commits_json = execute_curl_json(&commits_url, "GET", &headers, None).unwrap_or(serde_json::Value::Array(Vec::new()));
            let mut commits = Vec::new();
            if let Some(arr) = commits_json.as_array() {
                for c in arr {
                    let sha = c.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let message = c.get("title").or_else(|| c.get("message")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let author = c.get("author_name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let date = c.get("created_at").and_then(|v| v.as_str()).map(|s| s.to_string());
                    commits.push(PullRequestCommitItem { sha, message, author, date });
                }
            }

            // Fetch Changes/Diffs
            let changes_url = format!("{}/api/v4/projects/{}/merge_requests/{}/changes", host, encoded_project, num);
            let changes_json = execute_curl_json(&changes_url, "GET", &headers, None).unwrap_or(serde_json::Value::Null);
            let mut files = Vec::new();
            let mut total_additions = 0u64;
            let mut total_deletions = 0u64;
            if let Some(ch_arr) = changes_json.get("changes").and_then(|v| v.as_array()) {
                for f in ch_arr {
                    let filename = f.get("new_path").or_else(|| f.get("old_path")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let diff_str = f.get("diff").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let is_new = f.get("new_file").and_then(|v| v.as_bool()).unwrap_or(false);
                    let is_del = f.get("deleted_file").and_then(|v| v.as_bool()).unwrap_or(false);
                    let is_ren = f.get("renamed_file").and_then(|v| v.as_bool()).unwrap_or(false);
                    let status = if is_new { "added" } else if is_del { "removed" } else if is_ren { "renamed" } else { "modified" }.to_string();
                    let adds = diff_str.lines().filter(|l| l.starts_with('+') && !l.starts_with("+++")).count() as u64;
                    let dels = diff_str.lines().filter(|l| l.starts_with('-') && !l.starts_with("---")).count() as u64;
                    total_additions += adds;
                    total_deletions += dels;
                    files.push(PullRequestFileItem {
                        filename,
                        status,
                        additions: adds,
                        deletions: dels,
                        changes: adds + dels,
                        patch: Some(diff_str),
                    });
                }
            }

            Ok(PullRequestDetailResult {
                number: num,
                title,
                body,
                state,
                draft,
                merged,
                mergeable: Some(true),
                mergeable_state: None,
                html_url,
                user,
                head_ref,
                head_sha,
                base_ref,
                base_sha: "".to_string(),
                created_at,
                updated_at,
                comments,
                commits,
                files,
                total_additions,
                total_deletions,
                provider: "gitlab".to_string(),
            })
        }
        "bitbucket" => {
            let bb_url = format!("https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests/{}", payload.owner.trim(), payload.repo.trim(), num);
            let bb_json = execute_curl_json(&bb_url, "GET", &headers, None)?;

            let title = bb_json.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let body = bb_json.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
            let state_str = bb_json.get("state").and_then(|v| v.as_str()).unwrap_or("OPEN");
            let merged = state_str == "MERGED";
            let state = if merged { "merged".to_string() } else if state_str == "DECLINED" { "closed".to_string() } else { "open".to_string() };
            let html_url = bb_json.get("links").and_then(|l| l.get("html")).and_then(|h| h.get("href")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let head_ref = bb_json.get("source").and_then(|s| s.get("branch")).and_then(|b| b.get("name")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let head_sha = bb_json.get("source").and_then(|s| s.get("commit")).and_then(|c| c.get("hash")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let base_ref = bb_json.get("destination").and_then(|s| s.get("branch")).and_then(|b| b.get("name")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let base_sha = bb_json.get("destination").and_then(|s| s.get("commit")).and_then(|c| c.get("hash")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let created_at = bb_json.get("created_on").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let updated_at = bb_json.get("updated_on").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let user = bb_json.get("author").and_then(|a| {
                let login = a.get("nickname").or_else(|| a.get("display_name")).and_then(|v| v.as_str())?.to_string();
                let avatar_url = a.get("links").and_then(|l| l.get("avatar")).and_then(|av| av.get("href")).and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });

            // Comments
            let comments_url = format!("https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests/{}/comments", payload.owner.trim(), payload.repo.trim(), num);
            let comments_json = execute_curl_json(&comments_url, "GET", &headers, None).unwrap_or(serde_json::Value::Null);
            let mut comments = Vec::new();
            if let Some(arr) = comments_json.get("values").and_then(|v| v.as_array()) {
                for c in arr {
                    let id = c.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let body = c.get("content").and_then(|co| co.get("raw")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let created_at = c.get("created_on").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let c_user = c.get("user").and_then(|u| {
                        let login = u.get("nickname").or_else(|| u.get("display_name")).and_then(|v| v.as_str())?.to_string();
                        let avatar_url = u.get("links").and_then(|l| l.get("avatar")).and_then(|av| av.get("href")).and_then(|v| v.as_str()).map(|s| s.to_string());
                        Some(PrUser { login, avatar_url })
                    });
                    comments.push(PullRequestComment {
                        id,
                        user: c_user,
                        body,
                        created_at,
                        updated_at: None,
                    });
                }
            }

            // Commits
            let commits_url = format!("https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests/{}/commits", payload.owner.trim(), payload.repo.trim(), num);
            let commits_json = execute_curl_json(&commits_url, "GET", &headers, None).unwrap_or(serde_json::Value::Null);
            let mut commits = Vec::new();
            if let Some(arr) = commits_json.get("values").and_then(|v| v.as_array()) {
                for c in arr {
                    let sha = c.get("hash").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let message = c.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let author = c.get("author").and_then(|a| a.get("raw")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let date = c.get("date").and_then(|v| v.as_str()).map(|s| s.to_string());
                    commits.push(PullRequestCommitItem { sha, message, author, date });
                }
            }

            // Diffstat
            let diffstat_url = format!("https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests/{}/diffstat", payload.owner.trim(), payload.repo.trim(), num);
            let diffstat_json = execute_curl_json(&diffstat_url, "GET", &headers, None).unwrap_or(serde_json::Value::Null);
            let mut files = Vec::new();
            let mut total_additions = 0u64;
            let mut total_deletions = 0u64;
            if let Some(arr) = diffstat_json.get("values").and_then(|v| v.as_array()) {
                for f in arr {
                    let filename = f.get("new").or_else(|| f.get("old")).and_then(|n| n.get("path")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let status = f.get("status").and_then(|v| v.as_str()).unwrap_or("modified").to_string();
                    let adds = f.get("lines_added").and_then(|v| v.as_u64()).unwrap_or(0);
                    let dels = f.get("lines_removed").and_then(|v| v.as_u64()).unwrap_or(0);
                    total_additions += adds;
                    total_deletions += dels;
                    files.push(PullRequestFileItem {
                        filename,
                        status,
                        additions: adds,
                        deletions: dels,
                        changes: adds + dels,
                        patch: None,
                    });
                }
            }

            Ok(PullRequestDetailResult {
                number: num,
                title,
                body,
                state,
                draft: Some(false),
                merged,
                mergeable: Some(true),
                mergeable_state: None,
                html_url,
                user,
                head_ref,
                head_sha,
                base_ref,
                base_sha,
                created_at,
                updated_at,
                comments,
                commits,
                files,
                total_additions,
                total_deletions,
                provider: "bitbucket".to_string(),
            })
        }
        _ => {
            // Default: GitHub and Gitea
            let host = normalize_host(&payload.host_url, "https://github.com");
            let api_base = if host == "https://github.com" || host == "http://github.com" {
                "https://api.github.com".to_string()
            } else if provider == "gitea" {
                format!("{}/api/v1", host)
            } else {
                format!("{}/api/v3", host)
            };

            // 1. Fetch Pull Request main object
            let pr_url = format!("{}/repos/{}/{}/pulls/{}", api_base, payload.owner.trim(), payload.repo.trim(), num);
            let pr_json = execute_curl_json(&pr_url, "GET", &headers, None)?;

            let title = pr_json.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let body = pr_json.get("body").and_then(|v| v.as_str()).map(|s| s.to_string());
            let state_str = pr_json.get("state").and_then(|v| v.as_str()).unwrap_or("open");
            let merged = pr_json.get("merged").and_then(|v| v.as_bool()).unwrap_or(false);
            let state = if merged { "merged".to_string() } else { state_str.to_string() };
            let draft = pr_json.get("draft").and_then(|v| v.as_bool());
            let mergeable = pr_json.get("mergeable").and_then(|v| v.as_bool());
            let mergeable_state = pr_json.get("mergeable_state").and_then(|v| v.as_str()).map(|s| s.to_string());
            let html_url = pr_json.get("html_url").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let head_ref = pr_json.get("head").and_then(|h| h.get("ref")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let head_sha = pr_json.get("head").and_then(|h| h.get("sha")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let base_ref = pr_json.get("base").and_then(|b| b.get("ref")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let base_sha = pr_json.get("base").and_then(|b| b.get("sha")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let created_at = pr_json.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let updated_at = pr_json.get("updated_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let total_additions = pr_json.get("additions").and_then(|v| v.as_u64()).unwrap_or(0);
            let total_deletions = pr_json.get("deletions").and_then(|v| v.as_u64()).unwrap_or(0);
            let user = pr_json.get("user").and_then(|u| {
                let login = u.get("login").and_then(|v| v.as_str())?.to_string();
                let avatar_url = u.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });

            // 2. Fetch Comments (Issue comments endpoint)
            let comments_url = format!("{}/repos/{}/{}/issues/{}/comments?per_page=100", api_base, payload.owner.trim(), payload.repo.trim(), num);
            let comments_json = execute_curl_json(&comments_url, "GET", &headers, None).unwrap_or(serde_json::Value::Array(Vec::new()));
            let mut comments = Vec::new();
            if let Some(arr) = comments_json.as_array() {
                for c in arr {
                    let id = c.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let c_body = c.get("body").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let c_created = c.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let c_updated = c.get("updated_at").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let c_user = c.get("user").and_then(|u| {
                        let login = u.get("login").and_then(|v| v.as_str())?.to_string();
                        let avatar_url = u.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                        Some(PrUser { login, avatar_url })
                    });
                    comments.push(PullRequestComment {
                        id,
                        user: c_user,
                        body: c_body,
                        created_at: c_created,
                        updated_at: c_updated,
                    });
                }
            }

            // 3. Fetch Commits
            let commits_url = format!("{}/repos/{}/{}/pulls/{}/commits?per_page=100", api_base, payload.owner.trim(), payload.repo.trim(), num);
            let commits_json = execute_curl_json(&commits_url, "GET", &headers, None).unwrap_or(serde_json::Value::Array(Vec::new()));
            let mut commits = Vec::new();
            if let Some(arr) = commits_json.as_array() {
                for c in arr {
                    let sha = c.get("sha").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let message = c.get("commit").and_then(|co| co.get("message")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let author = c.get("commit")
                        .and_then(|co| co.get("author"))
                        .and_then(|a| a.get("name"))
                        .or_else(|| c.get("author").and_then(|a| a.get("login")))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let date = c.get("commit")
                        .and_then(|co| co.get("author"))
                        .and_then(|a| a.get("date"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    commits.push(PullRequestCommitItem { sha, message, author, date });
                }
            }

            // 4. Fetch Files with Patch Diff
            let files_url = format!("{}/repos/{}/{}/pulls/{}/files?per_page=100", api_base, payload.owner.trim(), payload.repo.trim(), num);
            let files_json = execute_curl_json(&files_url, "GET", &headers, None).unwrap_or(serde_json::Value::Array(Vec::new()));
            let mut files = Vec::new();
            if let Some(arr) = files_json.as_array() {
                for f in arr {
                    let filename = f.get("filename").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let status = f.get("status").and_then(|v| v.as_str()).unwrap_or("modified").to_string();
                    let additions = f.get("additions").and_then(|v| v.as_u64()).unwrap_or(0);
                    let deletions = f.get("deletions").and_then(|v| v.as_u64()).unwrap_or(0);
                    let changes = f.get("changes").and_then(|v| v.as_u64()).unwrap_or(additions + deletions);
                    let patch = f.get("patch").and_then(|v| v.as_str()).map(|s| s.to_string());
                    files.push(PullRequestFileItem {
                        filename,
                        status,
                        additions,
                        deletions,
                        changes,
                        patch,
                    });
                }
            }

            Ok(PullRequestDetailResult {
                number: num,
                title,
                body,
                state,
                draft,
                merged,
                mergeable,
                mergeable_state,
                html_url,
                user,
                head_ref,
                head_sha,
                base_ref,
                base_sha,
                created_at,
                updated_at,
                comments,
                commits,
                files,
                total_additions,
                total_deletions,
                provider: provider.clone(),
            })
        }
    }
}

pub fn post_pull_request_comment_impl(payload: &PostCommentPayload) -> Result<PullRequestComment, String> {
    let provider = payload.provider.trim().to_lowercase();
    let token = payload.token.trim();
    let num = payload.pr_number;
    let headers = make_auth_headers(&provider, token, payload.bitbucket_username.as_deref());

    match provider.as_str() {
        "gitlab" => {
            let host = normalize_host(&payload.host_url, "https://gitlab.com");
            let project_path = if !payload.full_path.trim().is_empty() {
                payload.full_path.trim().to_string()
            } else {
                format!("{}/{}", payload.owner.trim(), payload.repo.trim())
            };
            let encoded_project = url_encode_component(&project_path);
            let url = format!("{}/api/v4/projects/{}/merge_requests/{}/notes", host, encoded_project, num);
            let body_json = serde_json::json!({ "body": payload.body });
            let body_str = serde_json::to_string(&body_json).map_err(|e| e.to_string())?;

            let res = execute_curl_json(&url, "POST", &headers, Some(&body_str))?;
            let id = res.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
            let body = res.get("body").and_then(|v| v.as_str()).unwrap_or(&payload.body).to_string();
            let created_at = res.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let user = res.get("author").and_then(|a| {
                let login = a.get("username").or_else(|| a.get("name")).and_then(|v| v.as_str())?.to_string();
                let avatar_url = a.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });

            Ok(PullRequestComment {
                id,
                user,
                body,
                created_at,
                updated_at: None,
            })
        }
        "bitbucket" => {
            let url = format!("https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests/{}/comments", payload.owner.trim(), payload.repo.trim(), num);
            let body_json = serde_json::json!({
                "content": {
                    "raw": payload.body
                }
            });
            let body_str = serde_json::to_string(&body_json).map_err(|e| e.to_string())?;

            let res = execute_curl_json(&url, "POST", &headers, Some(&body_str))?;
            let id = res.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
            let body = res.get("content").and_then(|c| c.get("raw")).and_then(|v| v.as_str()).unwrap_or(&payload.body).to_string();
            let created_at = res.get("created_on").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let user = res.get("user").and_then(|u| {
                let login = u.get("nickname").or_else(|| u.get("display_name")).and_then(|v| v.as_str())?.to_string();
                let avatar_url = u.get("links").and_then(|l| l.get("avatar")).and_then(|av| av.get("href")).and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });

            Ok(PullRequestComment {
                id,
                user,
                body,
                created_at,
                updated_at: None,
            })
        }
        _ => {
            // GitHub and Gitea
            let host = normalize_host(&payload.host_url, "https://github.com");
            let api_base = if host == "https://github.com" || host == "http://github.com" {
                "https://api.github.com".to_string()
            } else if provider == "gitea" {
                format!("{}/api/v1", host)
            } else {
                format!("{}/api/v3", host)
            };

            let url = format!("{}/repos/{}/{}/issues/{}/comments", api_base, payload.owner.trim(), payload.repo.trim(), num);
            let body_json = serde_json::json!({ "body": payload.body });
            let body_str = serde_json::to_string(&body_json).map_err(|e| e.to_string())?;

            let res = execute_curl_json(&url, "POST", &headers, Some(&body_str))?;

            if let Some(err_msg) = res.get("message").and_then(|v| v.as_str()) {
                if res.get("id").is_none() {
                    return Err(format!("Failed to post comment: {}", err_msg));
                }
            }

            let id = res.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
            let body = res.get("body").and_then(|v| v.as_str()).unwrap_or(&payload.body).to_string();
            let created_at = res.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let updated_at = res.get("updated_at").and_then(|v| v.as_str()).map(|s| s.to_string());
            let user = res.get("user").and_then(|u| {
                let login = u.get("login").and_then(|v| v.as_str())?.to_string();
                let avatar_url = u.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PrUser { login, avatar_url })
            });

            Ok(PullRequestComment {
                id,
                user,
                body,
                created_at,
                updated_at,
            })
        }
    }
}

pub fn merge_pull_request_impl(payload: &MergePullRequestPayload) -> Result<String, String> {
    let provider = payload.provider.trim().to_lowercase();
    let token = payload.token.trim();
    let num = payload.pr_number;
    let headers = make_auth_headers(&provider, token, payload.bitbucket_username.as_deref());

    match provider.as_str() {
        "gitlab" => {
            let host = normalize_host(&payload.host_url, "https://gitlab.com");
            let project_path = if !payload.full_path.trim().is_empty() {
                payload.full_path.trim().to_string()
            } else {
                format!("{}/{}", payload.owner.trim(), payload.repo.trim())
            };
            let encoded_project = url_encode_component(&project_path);
            let url = format!("{}/api/v4/projects/{}/merge_requests/{}/merge", host, encoded_project, num);

            let mut body_map = serde_json::Map::new();
            if payload.merge_method == "squash" {
                body_map.insert("squash".to_string(), serde_json::Value::Bool(true));
            }
            if let Some(ref msg) = payload.commit_message {
                if !msg.trim().is_empty() {
                    body_map.insert("merge_commit_message".to_string(), serde_json::Value::String(msg.clone()));
                }
            }
            let body_str = serde_json::to_string(&body_map).map_err(|e| e.to_string())?;

            let res = execute_curl_json(&url, "PUT", &headers, Some(&body_str))?;
            if let Some(err) = res.get("message").and_then(|v| v.as_str()) {
                if res.get("state").is_none() {
                    return Err(format!("GitLab merge failed: {}", err));
                }
            }
            Ok(format!("Successfully merged Merge Request !{}", num))
        }
        "bitbucket" => {
            let url = format!("https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests/{}/merge", payload.owner.trim(), payload.repo.trim(), num);
            let mut body_map = serde_json::Map::new();
            if let Some(ref msg) = payload.commit_message {
                if !msg.trim().is_empty() {
                    body_map.insert("message".to_string(), serde_json::Value::String(msg.clone()));
                }
            }
            let strategy = if payload.merge_method == "squash" {
                "squash"
            } else if payload.merge_method == "rebase" {
                "fast_forward"
            } else {
                "merge_commit"
            };
            body_map.insert("merge_strategy".to_string(), serde_json::Value::String(strategy.to_string()));
            let body_str = serde_json::to_string(&body_map).map_err(|e| e.to_string())?;

            let res = execute_curl_json(&url, "POST", &headers, Some(&body_str))?;
            if let Some(err) = res.get("error").and_then(|e| e.get("message")).and_then(|v| v.as_str()) {
                return Err(format!("Bitbucket merge failed: {}", err));
            }
            Ok(format!("Successfully merged Pull Request #{}", num))
        }
        _ => {
            // GitHub and Gitea
            let host = normalize_host(&payload.host_url, "https://github.com");
            let api_base = if host == "https://github.com" || host == "http://github.com" {
                "https://api.github.com".to_string()
            } else if provider == "gitea" {
                format!("{}/api/v1", host)
            } else {
                format!("{}/api/v3", host)
            };

            let url = format!("{}/repos/{}/{}/pulls/{}/merge", api_base, payload.owner.trim(), payload.repo.trim(), num);
            let method = if payload.merge_method == "squash" {
                "squash"
            } else if payload.merge_method == "rebase" {
                "rebase"
            } else {
                "merge"
            };

            let mut body_map = serde_json::Map::new();
            body_map.insert("merge_method".to_string(), serde_json::Value::String(method.to_string()));
            if let Some(ref title) = payload.commit_title {
                if !title.trim().is_empty() {
                    body_map.insert("commit_title".to_string(), serde_json::Value::String(title.trim().to_string()));
                }
            }
            if let Some(ref msg) = payload.commit_message {
                if !msg.trim().is_empty() {
                    body_map.insert("commit_message".to_string(), serde_json::Value::String(msg.trim().to_string()));
                }
            }
            let body_str = serde_json::to_string(&body_map).map_err(|e| e.to_string())?;

            let res = execute_curl_json(&url, "PUT", &headers, Some(&body_str))?;

            if let Some(err_msg) = res.get("message").and_then(|v| v.as_str()) {
                let merged_ok = res.get("merged").and_then(|v| v.as_bool()).unwrap_or(false);
                if !merged_ok {
                    return Err(format!("Merge rejected: {}", err_msg));
                }
            }

            let default_msg = format!("Pull Request #{} successfully merged", num);
            let success_msg = res.get("message").and_then(|v| v.as_str()).unwrap_or(&default_msg).to_string();
            Ok(success_msg)
        }
    }
}

pub fn update_pull_request_state_impl(payload: &UpdatePullRequestStatePayload) -> Result<String, String> {
    let provider = payload.provider.trim().to_lowercase();
    let token = payload.token.trim();
    let num = payload.pr_number;
    let target_state = payload.state.trim().to_lowercase();
    let headers = make_auth_headers(&provider, token, payload.bitbucket_username.as_deref());

    match provider.as_str() {
        "gitlab" => {
            let host = normalize_host(&payload.host_url, "https://gitlab.com");
            let project_path = if !payload.full_path.trim().is_empty() {
                payload.full_path.trim().to_string()
            } else {
                format!("{}/{}", payload.owner.trim(), payload.repo.trim())
            };
            let encoded_project = url_encode_component(&project_path);
            let url = format!("{}/api/v4/projects/{}/merge_requests/{}", host, encoded_project, num);

            let event = if target_state == "closed" { "close" } else { "reopen" };
            let body_json = serde_json::json!({ "state_event": event });
            let body_str = serde_json::to_string(&body_json).map_err(|e| e.to_string())?;

            let res = execute_curl_json(&url, "PUT", &headers, Some(&body_str))?;
            if let Some(err) = res.get("message").and_then(|v| v.as_str()) {
                return Err(format!("GitLab update failed: {}", err));
            }
            Ok(format!("Merge Request !{} is now {}", num, target_state))
        }
        "bitbucket" => {
            if target_state == "closed" {
                let url = format!("https://api.bitbucket.org/2.0/repositories/{}/{}/pullrequests/{}/decline", payload.owner.trim(), payload.repo.trim(), num);
                let res = execute_curl_json(&url, "POST", &headers, None)?;
                if let Some(err) = res.get("error").and_then(|e| e.get("message")).and_then(|v| v.as_str()) {
                    return Err(format!("Bitbucket decline failed: {}", err));
                }
                Ok(format!("Pull Request #{} has been declined/closed", num))
            } else {
                Err("Reopening declined pull requests is not supported by Bitbucket Cloud API".to_string())
            }
        }
        _ => {
            // GitHub and Gitea
            let host = normalize_host(&payload.host_url, "https://github.com");
            let api_base = if host == "https://github.com" || host == "http://github.com" {
                "https://api.github.com".to_string()
            } else if provider == "gitea" {
                format!("{}/api/v1", host)
            } else {
                format!("{}/api/v3", host)
            };

            let url = format!("{}/repos/{}/{}/pulls/{}", api_base, payload.owner.trim(), payload.repo.trim(), num);
            let body_json = serde_json::json!({ "state": target_state });
            let body_str = serde_json::to_string(&body_json).map_err(|e| e.to_string())?;

            let res = execute_curl_json(&url, "PATCH", &headers, Some(&body_str))?;
            if let Some(err_msg) = res.get("message").and_then(|v| v.as_str()) {
                if res.get("state").is_none() {
                    return Err(format!("Failed to update PR state: {}", err_msg));
                }
            }

            Ok(format!("Pull Request #{} is now {}", num, target_state))
        }
    }
}
