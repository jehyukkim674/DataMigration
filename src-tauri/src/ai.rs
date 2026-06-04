use serde::Serialize;
use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// claude 실행 파일을 찾는다: 사용자 지정 → PATH → 알려진 위치.
fn find_claude(custom: Option<&str>) -> Option<PathBuf> {
    if let Some(p) = custom {
        let pb = PathBuf::from(p);
        if pb.exists() {
            return Some(pb);
        }
    }
    if let Ok(path) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path) {
            let cand = dir.join("claude");
            if cand.exists() {
                return Some(cand);
            }
        }
    }
    let home = std::env::var("HOME").unwrap_or_default();
    let known = [
        format!("{home}/.claude/local/claude"),
        "/opt/homebrew/bin/claude".to_string(),
        "/usr/local/bin/claude".to_string(),
        "/Applications/cmux.app/Contents/Resources/bin/claude".to_string(),
    ];
    for k in &known {
        let pb = PathBuf::from(k);
        if pb.exists() {
            return Some(pb);
        }
    }
    None
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiResponse {
    structured_output: serde_json::Value,
    message: String,
    cost_usd: f64,
}

const TIMEOUT_SECS: u64 = 120;

/// claude CLI를 블로킹 호출(타임아웃·stdin 차단). 별도 블로킹 스레드에서 실행됨.
fn run_claude(
    prompt: String,
    schema: String,
    model: Option<String>,
    claude_path: Option<String>,
) -> Result<AiResponse, String> {
    let bin = find_claude(claude_path.as_deref())
        .ok_or("claude CLI를 찾을 수 없습니다. 설정에서 실행 경로를 지정하세요.")?;
    let model = model.unwrap_or_else(|| "claude-haiku-4-5".to_string());
    let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());

    // stdin=null: 대화형/신뢰 프롬프트 대기로 인한 무한 멈춤 방지.
    let mut child = Command::new(&bin)
        .arg("-p")
        .arg(&prompt)
        .arg("--output-format")
        .arg("json")
        .arg("--json-schema")
        .arg(&schema)
        .arg("--model")
        .arg(&model)
        .current_dir(&home)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("claude 실행 실패: {e}"))?;

    let start = Instant::now();
    let status = loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(s) => break s,
            None => {
                if start.elapsed() > Duration::from_secs(TIMEOUT_SECS) {
                    let _ = child.kill();
                    return Err(format!("AI 응답 시간 초과({TIMEOUT_SECS}초). 다시 시도해 주세요."));
                }
                std::thread::sleep(Duration::from_millis(150));
            }
        }
    };

    let mut out = String::new();
    let mut err = String::new();
    if let Some(mut so) = child.stdout.take() {
        let _ = so.read_to_string(&mut out);
    }
    if let Some(mut se) = child.stderr.take() {
        let _ = se.read_to_string(&mut err);
    }
    if !status.success() {
        let msg = if err.trim().is_empty() { out.clone() } else { err };
        return Err(format!("claude 오류: {}", msg.trim()));
    }
    let v: serde_json::Value = serde_json::from_str(&out)
        .map_err(|e| format!("응답 파싱 실패: {e} / 출력 앞부분: {}", out.chars().take(160).collect::<String>()))?;
    Ok(AiResponse {
        structured_output: v
            .get("structured_output")
            .cloned()
            .unwrap_or(serde_json::Value::Null),
        message: v.get("result").and_then(|r| r.as_str()).unwrap_or("").to_string(),
        cost_usd: v.get("total_cost_usd").and_then(|c| c.as_f64()).unwrap_or(0.0),
    })
}

/// claude CLI를 호출해 구조화 명령을 받는다. 비동기(블로킹 스레드에서 실행 → UI 안 멈춤).
#[tauri::command]
pub async fn ai_command(
    prompt: String,
    schema: String,
    model: Option<String>,
    claude_path: Option<String>,
) -> Result<AiResponse, String> {
    tauri::async_runtime::spawn_blocking(move || run_claude(prompt, schema, model, claude_path))
        .await
        .map_err(|e| format!("AI 작업 실패: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn find_claude_prefers_existing_custom_path() {
        let exe = std::env::current_exe().unwrap();
        let exe_str = exe.to_str().unwrap();
        let found = find_claude(Some(exe_str)).unwrap();
        assert_eq!(found, exe);
    }

    #[test]
    fn find_claude_ignores_nonexistent_custom_path() {
        let found = find_claude(Some("/no/such/claude/binary/xyz"));
        if let Some(p) = found {
            assert_ne!(p, PathBuf::from("/no/such/claude/binary/xyz"));
        }
    }
}
