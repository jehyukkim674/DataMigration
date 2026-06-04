export type DataType = "string" | "number";
export type CellValue = string | number | null;

export interface Column {
  id: string;
  name: string;
  type: DataType;
  values: CellValue[];
}

/** Rust import/export 커맨드와 주고받는 직렬화 형태. */
export interface ColumnData {
  columns: { id: string; name: string; type: DataType }[];
  rows: CellValue[][]; // 행 단위 (Rust가 보내기 쉬움)
}

export function isEmpty(v: CellValue): boolean {
  return v === null || v === "";
}

export function normalizeType(t: string): DataType {
  return t === "number" ? "number" : "string";
}
