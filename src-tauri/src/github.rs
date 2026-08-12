use std::process::Command;
use std::net::TcpListener;
use std::io::{Read, Write};

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
                      <title>StageNode Authentication</title>\
                      <style>\
                        body { font-family: -apple-system, sans-serif; background: #080c14; color: #f8fafc; text-align: center; padding-top: 80px; }\
                        h1 { color: #6366f1; margin-bottom: 16px; font-weight: 700; }\
                        p { color: #94a3b8; font-size: 1.1rem; }\
                      </style>\
                    </head>\
                    <body>\
                      <h1>StageNode Connected</h1>\
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
       .arg("User-Agent: StageNode-App");

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
