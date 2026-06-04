import { expect, test } from "vitest";
import { EMPTY_VIEW, toggleSort, toggleHidden, isViewActive, setSort, setColumnFilter } from "./viewState";

test("EMPTY_VIEW는 비어있고 비활성", () => {
  expect(isViewActive(EMPTY_VIEW)).toBe(false);
});

test("toggleSort는 없음→asc→desc→없음 순환", () => {
  let v = toggleSort(EMPTY_VIEW, "c1");
  expect(v.sorts).toEqual([{ colId: "c1", dir: "asc" }]);
  v = toggleSort(v, "c1");
  expect(v.sorts).toEqual([{ colId: "c1", dir: "desc" }]);
  v = toggleSort(v, "c1");
  expect(v.sorts).toEqual([]);
});

test("toggleHidden은 숨김 추가/해제", () => {
  let v = toggleHidden(EMPTY_VIEW, "c2");
  expect(v.hiddenColumns).toEqual(["c2"]);
  v = toggleHidden(v, "c2");
  expect(v.hiddenColumns).toEqual([]);
});

test("isViewActive는 정렬/필터/숨김/쿼리 중 하나라도 있으면 true", () => {
  expect(isViewActive({ ...EMPTY_VIEW, query: "a = 1" })).toBe(true);
  expect(isViewActive(toggleHidden(EMPTY_VIEW, "c1"))).toBe(true);
});

test("setSort는 단일 정렬 지정/해제", () => {
  let v = setSort(EMPTY_VIEW, "c1", "desc");
  expect(v.sorts).toEqual([{ colId: "c1", dir: "desc" }]);
  v = setSort(v, "c2", "asc"); // 단일 정렬이므로 교체
  expect(v.sorts).toEqual([{ colId: "c2", dir: "asc" }]);
  v = setSort(v, "c2", null);
  expect(v.sorts).toEqual([]);
});

test("setColumnFilter는 컬럼당 필터 교체/제거", () => {
  let v = setColumnFilter(EMPTY_VIEW, "c1", { colId: "c1", op: "gt", value: 10 });
  expect(v.filters).toEqual([{ colId: "c1", op: "gt", value: 10 }]);
  v = setColumnFilter(v, "c1", { colId: "c1", op: "lt", value: 5 }); // 교체
  expect(v.filters).toEqual([{ colId: "c1", op: "lt", value: 5 }]);
  v = setColumnFilter(v, "c1", null); // 제거
  expect(v.filters).toEqual([]);
});
