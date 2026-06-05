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
  columnOrder?: string[]; // 표시 순서(전체 컬럼 id). 비어있으면 원본 순서.
  columnAliases?: Record<string, string>; // 컬럼 id → 별칭(설명). 헤더 표시용.
  columnSource?: Record<string, string>; // 컬럼 id → 출처(조인 시 A/B 파일명).
  headerLabel?: "alias" | "name" | "both"; // 헤더 표기 모드.
  showMinimap?: boolean; // 미니맵 표시 여부(기본 true).
  showAiPanel?: boolean; // 우측 AI 패널 표시 여부(기본 true).
  flaggedColumns?: string[]; // ★ 중요 표시한 컬럼 id.
}

export const EMPTY_VIEW: ViewState = {
  hiddenColumns: [],
  sorts: [],
  filters: [],
  query: "",
  columnOrder: [],
  columnAliases: {},
  headerLabel: "alias",
};

export function isViewActive(v: ViewState): boolean {
  return (
    v.hiddenColumns.length > 0 ||
    v.sorts.length > 0 ||
    v.filters.length > 0 ||
    v.query.trim() !== "" ||
    (v.columnOrder?.length ?? 0) > 0
  );
}

/** columnOrder + 새 컬럼을 합친 전체 표시 순서. */
export function effectiveColumnOrder(allIds: string[], columnOrder?: string[]): string[] {
  const inOrder = (columnOrder ?? []).filter((id) => allIds.includes(id));
  const missing = allIds.filter((id) => !inOrder.includes(id));
  return [...inOrder, ...missing];
}

export function setColumnOrder(v: ViewState, order: string[]): ViewState {
  return { ...v, columnOrder: order };
}

export function toggleColumnFlag(v: ViewState, colId: string): ViewState {
  const cur = v.flaggedColumns ?? [];
  const next = cur.includes(colId) ? cur.filter((c) => c !== colId) : [...cur, colId];
  return { ...v, flaggedColumns: next };
}

export function setColumnAlias(v: ViewState, colId: string, alias: string): ViewState {
  const next = { ...(v.columnAliases ?? {}) };
  if (alias.trim() === "") delete next[colId];
  else next[colId] = alias.trim();
  return { ...v, columnAliases: next };
}

/** 보이는 컬럼 기준 from→to 이동(숨긴 컬럼 위치는 유지). */
export function moveVisibleColumn(
  v: ViewState,
  allIds: string[],
  from: number,
  to: number,
): ViewState {
  const full = effectiveColumnOrder(allIds, v.columnOrder);
  const hidden = new Set(v.hiddenColumns);
  const visible = full.filter((id) => !hidden.has(id));
  if (from < 0 || from >= visible.length || to < 0 || to >= visible.length || from === to) return v;
  const [moved] = visible.splice(from, 1);
  visible.splice(to, 0, moved);
  let vi = 0;
  const newFull = full.map((id) => (hidden.has(id) ? id : visible[vi++]));
  return { ...v, columnOrder: newFull };
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
