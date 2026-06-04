mod export;
mod import;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    // 자동 업데이트/재시작 플러그인은 데스크톱에서만 등록한다.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    builder
        .invoke_handler(tauri::generate_handler![
            import::import_file,
            export::export_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
