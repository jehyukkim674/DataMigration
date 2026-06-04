use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

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

/// claude CLI를 호출해 구조화 명령을 받는다. 동기 커맨드(워커 스레드에서 실행).
#[tauri::command]
pub fn ai_command(
    prompt: String,
    schema: String,
    model: Option<String>,
    claude_path: Option<String>,
) -> Result<AiResponse, String> {
    let bin = find_claude(claude_path.as_deref())
        .ok_or("claude CLI를 찾을 수 없습니다. 설정에서 실행 경로를 지정하세요.")?;
    let model = model.unwrap_or_else(|| "claude-haiku-4-5".to_string());
    let output = Command::new(&bin)
        .arg("-p")
        .arg(&prompt)
        .arg("--output-format")
        .arg("json")
        .arg("--json-schema")
        .arg(&schema)
        .arg("--model")
        .arg(&model)
        .output()
        .map_err(|e| format!("claude 실행 실패: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "claude 오류: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let v: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("응답 파싱 실패: {e}"))?;
    Ok(AiResponse {
        structured_output: v
            .get("structured_output")
            .cloned()
            .unwrap_or(serde_json::Value::Null),
        message: v.get("result").and_then(|r| r.as_str()).unwrap_or("").to_string(),
        cost_usd: v.get("total_cost_usd").and_then(|c| c.as_f64()).unwrap_or(0.0),
    })
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
