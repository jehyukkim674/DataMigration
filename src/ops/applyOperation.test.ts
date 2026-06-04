import { expect, test } from "vitest";
import { ColumnStore } from "../data/ColumnStore";
import { applyOperation } from "./applyOperation";
import type { Operation } from "./operations";

function sample(): ColumnStore {
  return ColumnStore.fromRows(
    [
      { id: "c1", name: "first", type: "string" },
      { id: "c2", name: "last", type: "string" },
    ],
    [
      ["Kim", "Minsu"],
      ["Lee", "Yuna"],
    ],
  );
}

function roundTrip(op: Operation) {
  const s = sample();
  const { store: applied, inverse } = applyOperation(s, op);
  const { store: reverted } = applyOperation(applied, inverse);
  for (const c of s.columns) {
    expect(reverted.getColumn(c.id)?.values).toEqual(s.getColumn(c.id)?.values);
  }
  expect(reverted.colCount).toBe(s.colCount);
  return applied;
}

test("editCell 적용 + 왕복", () => {
  const applied = roundTrip({ kind: "editCell", colId: "c1", row: 0, value: "Park" });
  expect(applied.getCell(0, "c1")).toBe("Park");
});

test("mergeColumns 적용 + 왕복", () => {
  const applied = roundTrip({
    kind: "mergeColumns",
    sourceIds: ["c1", "c2"],
    separator: " ",
    newColumnId: "full",
    newColumnName: "fullname",
  });
  expect(applied.getCell(0, "full")).toBe("Kim Minsu");
});

test("splitColumn 적용 + 왕복", () => {
  const s = ColumnStore.fromRows(
    [{ id: "c1", name: "name", type: "string" }],
    [["Kim Minsu"], ["Lee Yuna"]],
  );
  const op: Operation = {
    kind: "splitColumn",
    sourceId: "c1",
    separator: " ",
    newColumns: [
      { id: "f", name: "first" },
      { id: "l", name: "last" },
    ],
  };
  const { store: applied, inverse } = applyOperation(s, op);
  expect(applied.getCell(0, "f")).toBe("Kim");
  expect(applied.getCell(0, "l")).toBe("Minsu");
  const { store: reverted } = applyOperation(applied, inverse);
  expect(reverted.getColumn("c1")?.values).toEqual(["Kim Minsu", "Lee Yuna"]);
  expect(reverted.colCount).toBe(1);
});

test("newColumn / deleteColumn / renameColumn 왕복", () => {
  roundTrip({ kind: "newColumn", id: "c3", name: "city", type: "string", fillValue: "Seoul" });
  roundTrip({ kind: "deleteColumn", colId: "c2" });
  roundTrip({ kind: "renameColumn", colId: "c1", name: "given" });
});
