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
