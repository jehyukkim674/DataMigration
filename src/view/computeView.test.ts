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

test("정렬: 빈 값은 항상 뒤로(asc, 안정)", () => {
  const s = ColumnStore.fromRows(
    [{ id: "c0", name: "v", type: "string" }],
    [["b"], [""], ["a"], [null as unknown as string]],
  );
  const r = computeView(s, { ...EMPTY_VIEW, sorts: [{ colId: "c0", dir: "asc" }] });
  expect(r.rowOrder).toEqual([2, 0, 1, 3]); // a, b, 그다음 빈 값 원순서 유지
});

test("정렬: number 컬럼의 숫자 아닌 값(NaN)은 항상 뒤로", () => {
  const s = ColumnStore.fromRows(
    [{ id: "c1", name: "나이", type: "number" }],
    [[30], ["미상" as unknown as number], [10], [null as unknown as number]],
  );
  const r = computeView(s, { ...EMPTY_VIEW, sorts: [{ colId: "c1", dir: "asc" }] });
  // 10, 30 순으로 정렬되고 비숫자/빈 값은 원순서를 유지하며 뒤로.
  expect(r.rowOrder).toEqual([2, 0, 1, 3]);
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
