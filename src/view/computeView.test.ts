import { expect, test } from "vitest";
import { ColumnStore } from "../data/ColumnStore";
import { computeView } from "./computeView";
import { EMPTY_VIEW } from "./viewState";

function sample(): ColumnStore {
  return ColumnStore.fromRows(
    [
      { id: "c0", name: "이름", type: "string" },
      { id: "c1", name: "나이", type: "number" },
    ],
    [
      ["Kim", 30],
      ["Lee", 25],
      ["Park", 40],
    ],
  );
}

test("기본 뷰는 전체 행/컬럼 원래 순서", () => {
  const r = computeView(sample(), EMPTY_VIEW);
  expect(r.visibleColumns.map((c) => c.id)).toEqual(["c0", "c1"]);
  expect(r.rowOrder).toEqual([0, 1, 2]);
});

test("숨긴 컬럼은 visibleColumns에서 제외", () => {
  const r = computeView(sample(), { ...EMPTY_VIEW, hiddenColumns: ["c1"] });
  expect(r.visibleColumns.map((c) => c.id)).toEqual(["c0"]);
});

test("별칭이 visibleColumns.alias에 반영", () => {
  const r = computeView(sample(), { ...EMPTY_VIEW, columnAliases: { c1: "나이(세)" } });
  expect(r.visibleColumns.find((c) => c.id === "c1")?.alias).toBe("나이(세)");
  expect(r.visibleColumns.find((c) => c.id === "c0")?.alias).toBeUndefined();
});

test("정렬: 나이 desc", () => {
  const r = computeView(sample(), { ...EMPTY_VIEW, sorts: [{ colId: "c1", dir: "desc" }] });
  expect(r.rowOrder).toEqual([2, 0, 1]);
});

test("구조화 필터: 나이 >= 30", () => {
  const r = computeView(sample(), { ...EMPTY_VIEW, filters: [{ colId: "c1", op: "gte", value: 30 }] });
  expect(r.rowOrder).toEqual([0, 2]);
});

test("쿼리 필터: 나이 > 25", () => {
  const r = computeView(sample(), { ...EMPTY_VIEW, query: "나이 > 25" });
  expect(r.rowOrder).toEqual([0, 2]);
});

test("잘못된 쿼리는 무시(전체 행 유지)하고 error 반환", () => {
  const r = computeView(sample(), { ...EMPTY_VIEW, query: "몸무게 > 1" });
  expect(r.rowOrder).toEqual([0, 1, 2]);
  expect(r.queryError).toBeTruthy();
});
