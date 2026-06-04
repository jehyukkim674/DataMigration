import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { ColumnStore } from "../data/ColumnStore";
import type { CellValue } from "../data/types";
import { normalizeType } from "../data/types";

interface RustColumnData {
  columns: { id: string; name: string; dataType: string }[];
  rows: CellValue[][];
}

export function columnDataToStore(data: RustColumnData): ColumnStore {
  return ColumnStore.fromRows(
    data.columns.map((c) => ({
      id: c.id,
      name: c.name,
      type: normalizeType(c.dataType),
    })),
    data.rows,
  );
}

/** 파일 선택 대화상자 → Rust 파싱 → ColumnStore. 취소 시 null. */
export async function importFileDialog(): Promise<ColumnStore | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: "데이터", extensions: ["csv", "xlsx", "xls"] }],
  });
  if (typeof path !== "string") return null;
  const data = await invoke<RustColumnData>("import_file", { path });
  return columnDataToStore(data);
}
