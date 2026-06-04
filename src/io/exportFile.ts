import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { ColumnStore } from "../data/ColumnStore";

export function storeToExportData(store: ColumnStore) {
  const columns = store.columns.map((c) => ({ name: c.name }));
  const rows: (string | number | null)[][] = [];
  for (let r = 0; r < store.rowCount; r++) {
    rows.push(store.columns.map((c) => store.getCell(r, c.id)));
  }
  return { columns, rows };
}

/** 저장 위치 선택 → Rust 내보내기. 취소 시 false. */
export async function exportFileDialog(store: ColumnStore): Promise<boolean> {
  const path = await save({
    filters: [
      { name: "Excel", extensions: ["xlsx"] },
      { name: "CSV", extensions: ["csv"] },
    ],
  });
  if (!path) return false;
  await invoke("export_file", { path, data: storeToExportData(store) });
  return true;
}
