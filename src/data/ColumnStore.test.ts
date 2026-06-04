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
