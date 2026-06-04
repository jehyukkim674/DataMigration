use serde::Serialize;
use std::path::Path;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColumnMeta {
    pub id: String,
    pub name: String,
    pub data_type: String, // "string" | "number"
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnData {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<Vec<serde_json::Value>>,
}

/// 첫 행을 헤더로 사용. 셀이 숫자로 전부 파싱되면 number 타입으로 추론.
fn build(headers: Vec<String>, rows: Vec<Vec<String>>) -> ColumnData {
    let col_count = headers.len();
    let mut is_number = vec![true; col_count];
    for row in &rows {
        for (i, cell) in row.iter().enumerate() {
            if i < col_count && !cell.is_empty() && cell.parse::<f64>().is_err() {
                is_number[i] = false;
            }
        }
    }
    let columns = headers
        .iter()
        .enumerate()
        .map(|(i, h)| ColumnMeta {
            id: format!("col{}", i),
            name: h.clone(),
            data_type: if is_number[i] { "number" } else { "string" }.into(),
        })
        .collect();
    let json_rows = rows
        .into_iter()
        .map(|row| {
            (0..col_count)
                .map(|i| {
                    let cell = row.get(i).cloned().unwrap_or_default();
                    if cell.is_empty() {
                        serde_json::Value::Null
                    } else if is_number[i] {
                        cell.parse::<f64>()
                            .ok()
                            .and_then(serde_json::Number::from_f64)
                            .map(serde_json::Value::Number)
                            .unwrap_or(serde_json::Value::Null)
                    } else {
                        serde_json::Value::String(cell)
                    }
                })
                .collect()
        })
        .collect();
    ColumnData { columns, rows: json_rows }
}

fn parse_csv(path: &Path) -> Result<ColumnData, String> {
    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .from_path(path)
        .map_err(|e| e.to_string())?;
    let mut records: Vec<Vec<String>> = Vec::new();
    for rec in rdr.records() {
        let rec = rec.map_err(|e| e.to_string())?;
        records.push(rec.iter().map(|s| s.to_string()).collect());
    }
    if records.is_empty() {
        return Err("빈 파일입니다".into());
    }
    let headers = records.remove(0);
    Ok(build(headers, records))
}

fn parse_xlsx(path: &Path) -> Result<ColumnData, String> {
    use calamine::{open_workbook_auto, Data, Reader};
    let mut wb = open_workbook_auto(path).map_err(|e| e.to_string())?;
    let name = wb
        .sheet_names()
        .first()
        .cloned()
        .ok_or("시트가 없습니다")?;
    let range = wb.worksheet_range(&name).map_err(|e| e.to_string())?;
    let mut rows: Vec<Vec<String>> = Vec::new();
    for row in range.rows() {
        rows.push(
            row.iter()
                .map(|c| match c {
                    Data::Empty => String::new(),
                    Data::String(s) => s.clone(),
                    Data::Float(f) => f.to_string(),
                    Data::Int(i) => i.to_string(),
                    Data::Bool(b) => b.to_string(),
                    other => other.to_string(),
                })
                .collect(),
        );
    }
    if rows.is_empty() {
        return Err("빈 시트입니다".into());
    }
    let headers = rows.remove(0);
    Ok(build(headers, rows))
}

#[tauri::command]
pub fn import_file(path: String) -> Result<ColumnData, String> {
    let p = Path::new(&path);
    match p.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()) {
        Some(ext) if ext == "csv" || ext == "tsv" || ext == "txt" => parse_csv(p),
        Some(ext) if ext == "xlsx" || ext == "xls" || ext == "xlsm" => parse_xlsx(p),
        _ => Err("지원하지 않는 파일 형식입니다 (csv/xlsx)".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_infers_number_column() {
        let data = build(
            vec!["name".into(), "age".into()],
            vec![
                vec!["Kim".into(), "30".into()],
                vec!["Lee".into(), "25".into()],
            ],
        );
        assert_eq!(data.columns[1].data_type, "number");
        assert_eq!(data.columns[0].data_type, "string");
        assert_eq!(data.rows.len(), 2);
    }

    #[test]
    fn build_handles_empty_cells() {
        let data = build(
            vec!["a".into(), "b".into()],
            vec![vec!["x".into(), "".into()]],
        );
        assert!(data.rows[0][1].is_null());
    }
}
