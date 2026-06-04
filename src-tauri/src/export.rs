use serde::Deserialize;
use std::path::Path;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportColumn {
    pub name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub columns: Vec<ExportColumn>,
    pub rows: Vec<Vec<serde_json::Value>>,
}

fn cell_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Null => String::new(),
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

fn write_csv(path: &Path, data: &ExportData) -> Result<(), String> {
    let mut wtr = csv::Writer::from_path(path).map_err(|e| e.to_string())?;
    wtr.write_record(data.columns.iter().map(|c| &c.name))
        .map_err(|e| e.to_string())?;
    for row in &data.rows {
        wtr.write_record(row.iter().map(cell_to_string))
            .map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}

fn write_xlsx(path: &Path, data: &ExportData) -> Result<(), String> {
    use rust_xlsxwriter::Workbook;
    let mut wb = Workbook::new();
    let sheet = wb.add_worksheet();
    for (c, col) in data.columns.iter().enumerate() {
        sheet
            .write_string(0, c as u16, &col.name)
            .map_err(|e| e.to_string())?;
    }
    for (r, row) in data.rows.iter().enumerate() {
        for (c, cell) in row.iter().enumerate() {
            let row_idx = (r + 1) as u32;
            match cell {
                serde_json::Value::Number(n) => {
                    sheet
                        .write_number(row_idx, c as u16, n.as_f64().unwrap_or(0.0))
                        .map_err(|e| e.to_string())?;
                }
                serde_json::Value::Null => {}
                other => {
                    sheet
                        .write_string(row_idx, c as u16, &cell_to_string(other))
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }
    wb.save(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn export_file(path: String, data: ExportData) -> Result<(), String> {
    let p = Path::new(&path);
    match p.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()) {
        Some(ext) if ext == "csv" => write_csv(p, &data),
        Some(ext) if ext == "xlsx" => write_xlsx(p, &data),
        _ => Err("지원하지 않는 내보내기 형식입니다 (csv/xlsx)".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn csv_export_roundtrips() {
        let dir = std::env::temp_dir();
        let path = dir.join("dm_export_test.csv");
        let data = ExportData {
            columns: vec![ExportColumn { name: "a".into() }, ExportColumn { name: "b".into() }],
            rows: vec![vec![
                serde_json::Value::String("x".into()),
                serde_json::json!(3.0),
            ]],
        };
        write_csv(&path, &data).unwrap();
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains("a,b"));
        assert!(content.contains("x,3"));
    }
}
