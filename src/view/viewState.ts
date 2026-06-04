export type SortDir = "asc" | "desc";
export interface SortSpec {
  colId: string;
  dir: SortDir;
}

export type FilterOp =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "contains" | "startsWith" | "endsWith" | "like"
  | "in"
  | "empty" | "notEmpty";

export interface FilterCondition {
  colId: string;
  op: FilterOp;
  value?: string | number;
  values?: (string | number)[]; // op="in"일 때 선택된 고유값 집합
}

export interface ViewState {
  hiddenColumns: string[];
  sorts: SortSpec[];
  filters: FilterCondition[];
  query: string;
}

export const EMPTY_VIEW: ViewState = {
  hiddenColumns: [],
  sorts: [],
  filters: [],
  query: "",
};

export function isViewActive(v: ViewState): boolean {
  return (
    v.hiddenColumns.length > 0 ||
    v.sorts.length > 0 ||
    v.filters.length > 0 ||
    v.query.trim() !== ""
  );
}

/** 해당 컬럼 정렬을 없음→asc→desc→없음으로 순환(다른 컬럼 정렬은 유지). */
export function toggleSort(v: ViewState, colId: string): ViewState {
  const existing = v.sorts.find((s) => s.colId === colId);
  const others = v.sorts.filter((s) => s.colId !== colId);
  let next: SortSpec[];
  if (!existing) next = [...others, { colId, dir: "asc" }];
  else if (existing.dir === "asc") next = [...others, { colId, dir: "desc" }];
  else next = others;
  return { ...v, sorts: next };
}

export function toggleHidden(v: ViewState, colId: string): ViewState {
  const hidden = v.hiddenColumns.includes(colId)
    ? v.hiddenColumns.filter((c) => c !== colId)
    : [...v.hiddenColumns, colId];
  return { ...v, hiddenColumns: hidden };
}

/** 컬럼 정렬을 명시적으로 지정(단일 정렬). dir=null이면 해제. */
export function setSort(v: ViewState, colId: string, dir: SortDir | null): ViewState {
  return { ...v, sorts: dir ? [{ colId, dir }] : v.sorts.filter((s) => s.colId !== colId) };
}

/** 컬럼의 필터를 교체(없으면 추가, cond=null이면 제거). 한 컬럼당 조건 하나. */
export function setColumnFilter(
  v: ViewState,
  colId: string,
  cond: FilterCondition | null,
): ViewState {
  const others = v.filters.filter((f) => f.colId !== colId);
  return { ...v, filters: cond ? [...others, cond] : others };
}
