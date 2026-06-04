import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { ColumnStore } from "../data/ColumnStore";

export interface ExportView {
  columnIds: string[];
  rowOrder: number[];
}

export function storeToExportData(store: ColumnStore, view?: ExportView) {
  const colIds = view ? view.columnIds : store.columns.map((c) => c.id);
  const rows = view ? view.rowOrder : Array.from({ length: store.rowCount }, (_, i) => i);
  const columns = colIds.map((id) => ({
    name: store.columns.find((c) => c.id === id)?.name ?? id,
  }));
  const out: (string | number | null)[][] = rows.map((r) => colIds.map((id) => store.getCell(r, id)));
  return { columns, rows: out };
}

export async function exportFileDialog(store: ColumnStore, view?: ExportView): Promise<boolean> {
  const path = await save({
    filters: [
      { name: "Excel", extensions: ["xlsx"] },
      { name: "CSV", extensions: ["csv"] },
    ],
  });
  if (!path) return false;
  await invoke("export_file", { path, data: storeToExportData(store, view) });
  return true;
}
