import { expect, test, vi, beforeEach } from "vitest";
import { ColumnStore } from "../data/ColumnStore";

const invokeMock = vi.fn();
const saveMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invokeMock(...a) }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: (...a: unknown[]) => saveMock(...a) }));

import { storeToExportData, exportFileDialog } from "./exportFile";

beforeEach(() => { invokeMock.mockReset(); saveMock.mockReset(); });

function sample() {
  return ColumnStore.fromRows(
    [{ id: "c0", name: "이름", type: "string" }, { id: "c1", name: "나이", type: "number" }],
    [["Kim", 30], ["Lee", 25]],
  );
}

test("전체 내보내기", () => {
  const d = storeToExportData(sample());
  expect(d.columns).toEqual([{ name: "이름" }, { name: "나이" }]);
  expect(d.rows).toEqual([["Kim", 30], ["Lee", 25]]);
});

test("보이는 컬럼/행만 내보내기", () => {
  const d = storeToExportData(sample(), { columnIds: ["c1"], rowOrder: [1] });
  expect(d.columns).toEqual([{ name: "나이" }]);
  expect(d.rows).toEqual([[25]]);
});

test("exportFileDialog: 취소 시 false", async () => {
  saveMock.mockResolvedValue(null);
  expect(await exportFileDialog(sample())).toBe(false);
});

test("exportFileDialog: 경로 선택 시 export_file invoke", async () => {
  saveMock.mockResolvedValue("/out.csv");
  invokeMock.mockResolvedValue(undefined);
  expect(await exportFileDialog(sample())).toBe(true);
  expect(invokeMock).toHaveBeenCalledWith("export_file", expect.objectContaining({ path: "/out.csv" }));
});
