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

test("editCell은 number 컬럼 편집 시 문자열을 숫자로 강제한다", () => {
  const s = ColumnStore.fromRows(
    [{ id: "age", name: "age", type: "number" }],
    [[30], [25]],
  );
  const { store } = applyOperation(s, {
    kind: "editCell",
    colId: "age",
    row: 0,
    value: "31", // 그리드는 항상 문자열로 넘긴다
  });
  expect(store.getCell(0, "age")).toBe(31); // 숫자로 저장
  // 빈 문자열은 null
  const { store: cleared } = applyOperation(s, {
    kind: "editCell",
    colId: "age",
    row: 0,
    value: "",
  });
  expect(cleared.getCell(0, "age")).toBeNull();
});

test("splitColumnMap: 조각을 매핑한 컬럼 생성 + 왕복(제외 조각은 컬럼 없음)", () => {
  const s = ColumnStore.fromRows(
    [{ id: "os", name: "OS정보", type: "string" }],
    [["CentOs 5.3 LTS"], ["Ubuntu 20.04"]],
  );
  const op: Operation = {
    kind: "splitColumnMap",
    sourceId: "os",
    separator: " ",
    parts: [
      { index: 0, id: "osname", name: "os명" },
      { index: 1, id: "osver", name: "os버전" },
      // index 2(LTS)는 제외
    ],
  };
  const { store: applied, inverse } = applyOperation(s, op);
  expect(applied.getCell(0, "osname")).toBe("CentOs");
  expect(applied.getCell(0, "osver")).toBe("5.3");
  expect(applied.getCell(1, "osname")).toBe("Ubuntu");
  expect(applied.getColumn("osname")?.name).toBe("os명");
  expect(applied.colCount).toBe(3); // 원본 + 2
  const { store: reverted } = applyOperation(applied, inverse);
  expect(reverted.colCount).toBe(1);
  expect(reverted.getColumn("os")?.values).toEqual(["CentOs 5.3 LTS", "Ubuntu 20.04"]);
});

test("deleteRows: 행 삭제 + 왕복(insertRows로 복원)", () => {
  const s = ColumnStore.fromRows(
    [{ id: "c1", name: "v", type: "number" }, { id: "c2", name: "n", type: "string" }],
    [[10, "a"], [20, "b"], [30, "c"]],
  );
  const { store: applied, inverse } = applyOperation(s, { kind: "deleteRows", rows: [1] });
  expect(applied.rowCount).toBe(2);
  expect(applied.getColumn("c1")?.values).toEqual([10, 30]);
  const { store: reverted } = applyOperation(applied, inverse);
  expect(reverted.getColumn("c1")?.values).toEqual([10, 20, 30]);
  expect(reverted.getColumn("c2")?.values).toEqual(["a", "b", "c"]);
});

test("formulaColumns: 조건식 수식으로 컬럼 생성 + 왕복", () => {
  const s = ColumnStore.fromRows(
    [{ id: "os", name: "OS", type: "string" }],
    [["CentOs 5.3 LTS"], ["Ubuntu 20.04"]],
  );
  const op: Operation = {
    kind: "formulaColumns",
    sourceId: "os",
    separator: " ",
    mode: "separator",
    columns: [
      { id: "name", name: "os명", formula: "p0" },
      { id: "lts", name: "LTS여부", formula: 'if(contains(value, "LTS"), "Y", "N")' },
    ],
  };
  const { store: applied, inverse } = applyOperation(s, op);
  expect(applied.getCell(0, "name")).toBe("CentOs");
  expect(applied.getCell(0, "lts")).toBe("Y");
  expect(applied.getCell(1, "lts")).toBe("N");
  const { store: reverted } = applyOperation(applied, inverse);
  expect(reverted.colCount).toBe(1);
});

test("replaceInColumn: 특정 열 치환 + 왕복", () => {
  const s = ColumnStore.fromRows(
    [{ id: "c", name: "도시", type: "string" }],
    [["서울특별시"], ["부산광역시"], ["대구광역시"]],
  );
  const { store: applied, inverse } = applyOperation(s, { kind: "replaceInColumn", colId: "c", find: "광역시", replace: "", regex: false });
  expect(applied.getColumn("c")?.values).toEqual(["서울특별시", "부산", "대구"]);
  const { store: reverted } = applyOperation(applied, inverse);
  expect(reverted.getColumn("c")?.values).toEqual(["서울특별시", "부산광역시", "대구광역시"]);
});

test("존재하지 않는 컬럼 작업은 store를 그대로 둔다(no-op)", () => {
  const s = ColumnStore.fromRows(
    [{ id: "c1", name: "first", type: "string" }],
    [["Kim"]],
  );
  const { store } = applyOperation(s, { kind: "deleteColumn", colId: "nope" });
  expect(store).toBe(s); // 동일 참조
});
