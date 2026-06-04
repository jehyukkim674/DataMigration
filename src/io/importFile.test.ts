import { expect, test, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();
const openMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invokeMock(...a) }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: (...a: unknown[]) => openMock(...a) }));

import { columnDataToStore, importFileDialog } from "./importFile";

beforeEach(() => { invokeMock.mockReset(); openMock.mockReset(); });

test("columnDataToStore는 Rust 응답을 ColumnStore로 변환한다", () => {
  const store = columnDataToStore({
    columns: [
      { id: "col0", name: "name", dataType: "string" },
      { id: "col1", name: "age", dataType: "number" },
    ],
    rows: [["Kim", 30], ["Lee", 25]],
  });
  expect(store.rowCount).toBe(2);
  expect(store.getCell(0, "col0")).toBe("Kim");
  expect(store.getColumn("col1")?.type).toBe("number");
});

test("importFileDialog: 취소 시 null", async () => {
  openMock.mockResolvedValue(null);
  expect(await importFileDialog()).toBeNull();
});

test("importFileDialog: 파일 선택 시 store+path 반환", async () => {
  openMock.mockResolvedValue("/data/f.csv");
  invokeMock.mockResolvedValue({ columns: [{ id: "col0", name: "a", dataType: "string" }], rows: [["x"]] });
  const r = await importFileDialog();
  expect(invokeMock).toHaveBeenCalledWith("import_file", { path: "/data/f.csv" });
  expect(r?.path).toBe("/data/f.csv");
  expect(r?.store.rowCount).toBe(1);
});
