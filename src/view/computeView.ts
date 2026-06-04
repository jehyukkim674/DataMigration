import type { ColumnStore } from "../data/ColumnStore";
import type { DataType } from "../data/types";
import { evalCondition } from "./filter";
import { parseQuery } from "./query";
import { effectiveColumnOrder, type FilterCondition, type ViewState } from "./viewState";

export interface VisibleColumn {
  id: string;
  name: string;
  type: DataType;
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
  const visibleColumns = order
    .filter((id) => !view.hiddenColumns.includes(id))
    .map((id) => byId.get(id)!)
    .filter(Boolean);

  const parsed = parseQuery(view.query, store.columns);
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

  const colType = (id: string): DataType =>
    store.columns.find((c) => c.id === id)?.type ?? "string";
  const cmp = (a: number, b: number, colId: string, dir: "asc" | "desc"): number => {
    const va = store.getCell(a, colId);
    const vb = store.getCell(b, colId);
    const ea = va === null || va === "";
    const eb = vb === null || vb === "";
    if (ea && eb) return 0;
    if (ea) return 1;
    if (eb) return -1;
    let res: number;
    if (colType(colId) === "number") res = Number(va) - Number(vb);
    else res = String(va).localeCompare(String(vb));
    return dir === "asc" ? res : -res;
  };
  for (let i = view.sorts.length - 1; i >= 0; i--) {
    const s = view.sorts[i];
    rows = stableSort(rows, (a, b) => cmp(a, b, s.colId, s.dir));
  }

  return { visibleColumns, rowOrder: rows, queryError };
}

function stableSort(arr: number[], compare: (a: number, b: number) => number): number[] {
  return arr
    .map((v, i) => ({ v, i }))
    .sort((x, y) => compare(x.v, y.v) || x.i - y.i)
    .map((x) => x.v);
}
