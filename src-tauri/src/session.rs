use std::path::PathBuf;
use tauri::Manager;

fn session_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("session.json"))
}

/// 마지막 화면(데이터+뷰)을 앱 데이터 폴더에 저장.
#[tauri::command]
pub fn save_session(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let p = session_path(&app)?;
    std::fs::write(p, json).map_err(|e| e.to_string())
}

/// 저장된 마지막 화면을 불러온다(없으면 None).
#[tauri::command]
pub fn load_session(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let p = session_path(&app)?;
    if !p.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(p).map(Some).map_err(|e| e.to_string())
}

fn snapshots_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("snapshots.json"))
}

/// 스냅샷 목록(JSON 배열)을 저장.
#[tauri::command]
pub fn save_snapshots(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let p = snapshots_path(&app)?;
    std::fs::write(p, json).map_err(|e| e.to_string())
}

/// 저장된 스냅샷 목록을 불러온다(없으면 None).
#[tauri::command]
pub fn load_snapshots(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let p = snapshots_path(&app)?;
    if !p.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(p).map(Some).map_err(|e| e.to_string())
}
