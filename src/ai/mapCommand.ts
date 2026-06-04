import type { Operation } from "../ops/operations";
import {
  EMPTY_VIEW,
  type FilterCondition,
  type FilterOp,
  type SortDir,
  type ViewState,
} from "../view/viewState";
import type { AiCommand } from "./commandSchema";

export type ViewMutation =
  | { type: "filter"; cond: FilterCondition }
  | { type: "sort"; colId: string; dir: SortDir }
  | { type: "hide"; colId: string }
  | { type: "clear" };

export interface MapResult {
  ops: Operation[];
  mutations: ViewMutation[];
  errors: string[];
}

interface ColRef {
  id: string;
  name: string;
}

const OP_SYMBOL: Record<string, FilterOp> = {
  "=": "eq", "==": "eq", "!=": "neq",
  ">": "gt", ">=": "gte", "<": "lt", "<=": "lte",
  contains: "contains", startswith: "startsWith", endswith: "endsWith",
  like: "like",
  empty: "empty", notempty: "notEmpty",
};

function colId(name: string | undefined, cols: ColRef[]): string | undefined {
  if (!name) return undefined;
  return cols.find((c) => c.name === name)?.id;
}

function num(v: string | undefined): string | number {
  if (v === undefined) return "";
  return /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v;
}

export function mapCommands(
  commands: AiCommand[],
  cols: ColRef[],
  genId: () => string,
): MapResult {
  const ops: Operation[] = [];
  const mutations: ViewMutation[] = [];
  const errors: string[] = [];

  for (const cmd of commands) {
    const id = (n?: string) => colId(n, cols);
    switch (cmd.action) {
      case "clearView":
        mutations.push({ type: "clear" });
        break;
      case "filter": {
        const c = id(cmd.columnName);
        if (!c) { errors.push(`알 수 없는 컬럼: ${cmd.columnName}`); break; }
        const op = OP_SYMBOL[(cmd.op ?? "=").toLowerCase()] ?? "eq";
        mutations.push({ type: "filter", cond: { colId: c, op, value: num(cmd.value) } });
        break;
      }
      case "sort": {
        const c = id(cmd.columnName);
        if (!c) { errors.push(`알 수 없는 컬럼: ${cmd.columnName}`); break; }
        mutations.push({ type: "sort", colId: c, dir: cmd.direction === "desc" ? "desc" : "asc" });
        break;
      }
      case "hideColumn": {
        const c = id(cmd.columnName);
        if (!c) { errors.push(`알 수 없는 컬럼: ${cmd.columnName}`); break; }
        mutations.push({ type: "hide", colId: c });
        break;
      }
      case "editCell": {
        const c = id(cmd.columnName);
        if (!c || cmd.row === undefined) { errors.push("editCell에 컬럼/행 필요"); break; }
        ops.push({ kind: "editCell", colId: c, row: cmd.row, value: cmd.value ?? "" });
        break;
      }
      case "mergeColumns": {
        const ids = (cmd.columnNames ?? []).map((n) => id(n));
        if (ids.some((x) => !x)) { errors.push(`알 수 없는 컬럼(머지): ${cmd.columnNames}`); break; }
        ops.push({
          kind: "mergeColumns",
          sourceIds: ids as string[],
          separator: cmd.separator ?? " ",
          newColumnId: genId(),
          newColumnName: cmd.newColumnName ?? "merged",
        });
        break;
      }
      case "splitColumn": {
        const c = id(cmd.columnName);
        if (!c) { errors.push(`알 수 없는 컬럼: ${cmd.columnName}`); break; }
        ops.push({
          kind: "splitColumn",
          sourceId: c,
          separator: cmd.separator ?? " ",
          newColumns: [
            { id: genId(), name: `${cmd.columnName}_1` },
            { id: genId(), name: `${cmd.columnName}_2` },
          ],
        });
        break;
      }
      case "newColumn":
        ops.push({
          kind: "newColumn",
          id: genId(),
          name: cmd.newColumnName ?? cmd.columnName ?? "새컬럼",
          type: "string",
          fillValue: cmd.value ?? "",
        });
        break;
      case "deleteColumn": {
        const c = id(cmd.columnName);
        if (!c) { errors.push(`알 수 없는 컬럼: ${cmd.columnName}`); break; }
        ops.push({ kind: "deleteColumn", colId: c });
        break;
      }
      case "renameColumn": {
        const c = id(cmd.columnName);
        if (!c || !cmd.newColumnName) { errors.push("renameColumn에 컬럼/새이름 필요"); break; }
        ops.push({ kind: "renameColumn", colId: c, name: cmd.newColumnName });
        break;
      }
      default:
        errors.push(`알 수 없는 명령: ${(cmd as AiCommand).action}`);
    }
  }
  return { ops, mutations, errors };
}

export function applyMutations(view: ViewState, muts: ViewMutation[]): ViewState {
  let v = view;
  for (const m of muts) {
    if (m.type === "clear") v = EMPTY_VIEW;
    else if (m.type === "filter") v = { ...v, filters: [...v.filters, m.cond] };
    else if (m.type === "sort") v = { ...v, sorts: [...v.sorts.filter((s) => s.colId !== m.colId), { colId: m.colId, dir: m.dir }] };
    else if (m.type === "hide") v = { ...v, hiddenColumns: v.hiddenColumns.includes(m.colId) ? v.hiddenColumns : [...v.hiddenColumns, m.colId] };
  }
  return v;
}
