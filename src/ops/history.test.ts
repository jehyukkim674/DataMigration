import { expect, test } from "vitest";
import { ColumnStore } from "../data/ColumnStore";
import { History } from "./history";

function sample(): ColumnStore {
  return ColumnStore.fromRows(
    [{ id: "c1", name: "v", type: "number" }],
    [[1], [2], [3]],
  );
}

test("apply 후 undo/redo가 상태를 되돌리고 다시 적용한다", () => {
  const h = new History(sample());
  h.apply({ kind: "editCell", colId: "c1", row: 0, value: 99 });
  expect(h.store.getCell(0, "c1")).toBe(99);
  expect(h.canUndo).toBe(true);

  h.undo();
  expect(h.store.getCell(0, "c1")).toBe(1);
  expect(h.canRedo).toBe(true);

  h.redo();
  expect(h.store.getCell(0, "c1")).toBe(99);
});

test("새 apply는 redo 스택을 비운다", () => {
  const h = new History(sample());
  h.apply({ kind: "editCell", colId: "c1", row: 0, value: 99 });
  h.undo();
  h.apply({ kind: "editCell", colId: "c1", row: 1, value: 50 });
  expect(h.canRedo).toBe(false);
});

test("entries는 적용된 작업 설명 목록을 제공한다", () => {
  const h = new History(sample());
  h.apply({ kind: "editCell", colId: "c1", row: 0, value: 99 });
  expect(h.entries.length).toBe(1);
  expect(h.entries[0]).toContain("셀 편집");
});
