import { expect, test } from "vitest";
import { ColumnStore } from "./ColumnStore";

function sample(): ColumnStore {
  return ColumnStore.fromRows(
    [
      { id: "c1", name: "name", type: "string" },
      { id: "c2", name: "age", type: "number" },
    ],
    [
      ["Kim Minsu", 30],
      ["Lee Yuna", 25],
    ],
  );
}

test("rowCount/colCount/getCell이 올바르다", () => {
  const s = sample();
  expect(s.rowCount).toBe(2);
  expect(s.colCount).toBe(2);
  expect(s.getCell(0, "c1")).toBe("Kim Minsu");
  expect(s.getCell(1, "c2")).toBe(25);
});

test("setCell은 새 store를 반환하고 원본은 불변", () => {
  const s = sample();
  const s2 = s.setCell(0, "c2", 31);
  expect(s2.getCell(0, "c2")).toBe(31);
  expect(s.getCell(0, "c2")).toBe(30);
});

test("addColumn은 컬럼을 추가하고 행마다 값을 채운다", () => {
  const s = sample().addColumn(
    { id: "c3", name: "city", type: "string" },
    (rowIndex) => (rowIndex === 0 ? "Seoul" : "Busan"),
  );
  expect(s.colCount).toBe(3);
  expect(s.getCell(0, "c3")).toBe("Seoul");
  expect(s.getCell(1, "c3")).toBe("Busan");
});

test("removeColumn은 컬럼을 제거한다", () => {
  const s = sample().removeColumn("c2");
  expect(s.colCount).toBe(1);
  expect(s.columns[0].id).toBe("c1");
});

test("getColumn은 컬럼 메타+값을 반환한다", () => {
  const col = sample().getColumn("c1");
  expect(col?.name).toBe("name");
  expect(col?.values).toEqual(["Kim Minsu", "Lee Yuna"]);
});

test("setColumnValues 교체 + 없는 컬럼은 no-op", () => {
  const s = ColumnStore.fromRows([{ id: "c", name: "v", type: "number" }], [[1], [2]]);
  expect(s.setColumnValues("c", [7, 8]).getColumn("c")?.values).toEqual([7, 8]);
  expect(s.setColumnValues("nope", [1]).getColumn("c")?.values).toEqual([1, 2]);
});

test("rawValues는 내부 배열 반환(없으면 undefined)", () => {
  const s = ColumnStore.fromRows([{ id: "c", name: "v", type: "number" }], [[1], [2]]);
  expect(s.rawValues("c")).toEqual([1, 2]);
  expect(s.rawValues("nope")).toBeUndefined();
});

test("uniqueValues는 빈 값 제외 + 정렬", () => {
  const s = ColumnStore.fromRows([{ id: "c", name: "v", type: "string" }], [["b"], [""], ["a"], ["b"], [null as unknown as string]]);
  expect(s.uniqueValues("c")).toEqual(["a", "b"]);
  expect(s.uniqueValues("nope")).toEqual([]);
});

test("removeRows/insertRows 왕복", () => {
  const s = ColumnStore.fromRows(
    [{ id: "c1", name: "v", type: "number" }],
    [[10], [20], [30], [40]],
  );
  const after = s.removeRows([1, 3]);
  expect(after.rowCount).toBe(2);
  expect(after.getColumn("c1")?.values).toEqual([10, 30]);
  const back = after.insertRows([
    { index: 1, cells: { c1: 20 } },
    { index: 3, cells: { c1: 40 } },
  ]);
  expect(back.getColumn("c1")?.values).toEqual([10, 20, 30, 40]);
});
