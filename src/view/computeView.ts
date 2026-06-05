import type { ColumnStore } from "../data/ColumnStore";
import type { DataType } from "../data/types";
import { evalCondition } from "./filter";
import { parseQuery } from "./query";
import { effectiveColumnOrder, type FilterCondition, type ViewState } from "./viewState";

export interface VisibleColumn {
  id: string;
  name: string;
  type: DataType;
  alias?: string;
}

export interface ComputedView {
  visibleColumns: VisibleColumn[];
  rowOrder: number[];
  queryError?: string;
}

function matchesAll(store: ColumnStore, row: number, conds: FilterCondition[]): boolean {
  return conds.every((c) => evalCondition(store.getCell(row, c.colId), c));
}

export function computeView(store: ColumnStore, view: ViewState): ComputedView {
  const byId = new Map(store.columns.map((c) => [c.id, c]));
  const order = effectiveColumnOrder(store.columns.map((c) => c.id), view.columnOrder);
  const visibleColumns: VisibleColumn[] = order
    .filter((id) => !view.hiddenColumns.includes(id))
    .map((id) => byId.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name, type: c.type, alias: view.columnAliases?.[c.id] }));

  const parsed = parseQuery(
    view.query,
    store.columns.map((c) => ({ id: c.id, name: c.name, alias: view.columnAliases?.[c.id] })),
  );
  let queryError: string | undefined;
  let queryGroups: FilterCondition[][] = [];
  if (!parsed.ok) queryError = parsed.error;
  else queryGroups = parsed.groups;

  let rows: number[] = [];
  for (let r = 0; r < store.rowCount; r++) {
    if (!matchesAll(store, r, view.filters)) continue;
    if (queryGroups.length > 0) {
      const anyGroup = queryGroups.some((g) => matchesAll(store, r, g));
      if (!anyGroup) continue;
    }
    rows.push(r);
  }

  // 정렬: 비교마다 컬럼/값을 다시 찾지 않도록 정렬 컬럼별 값 배열·타입을 미리 확보.
  for (let i = view.sorts.length - 1; i >= 0; i--) {
    const s = view.sorts[i];
    const col = byId.get(s.colId);
    const vals = store.rawValues(s.colId);
    if (!col || !vals) continue;
    const numeric = col.type === "number";
    const dir = s.dir === "asc" ? 1 : -1;
    rows = stableSort(rows, (a, b) => {
      const va = vals[a];
      const vb = vals[b];
      const ea = va === null || va === "";
      const eb = vb === null || vb === "";
      if (ea && eb) return 0;
      if (ea) return 1; // 빈 값은 항상 뒤로
      if (eb) return -1;
      const res = numeric ? Number(va) - Number(vb) : String(va).localeCompare(String(vb));
      return dir * res;
    });
  }

  return { visibleColumns, rowOrder: rows, queryError };
}

function stableSort(arr: number[], compare: (a: number, b: number) => number): number[] {
  return arr
    .map((v, i) => ({ v, i }))
    .sort((x, y) => compare(x.v, y.v) || x.i - y.i)
    .map((x) => x.v);
}
