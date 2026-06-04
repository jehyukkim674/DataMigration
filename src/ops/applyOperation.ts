import { ColumnStore } from "../data/ColumnStore";
import type { CellValue, DataType } from "../data/types";
import type { Operation } from "./operations";
import { mergeValues, splitPiece, splitToPieces, splitValue } from "./transforms";
import { evalFormula } from "./formula";

export interface ApplyResult {
  store: ColumnStore;
  inverse: Operation;
}

/** 셀 값을 컬럼의 선언된 타입에 맞춘다. number 컬럼이면 빈 값은 null, 숫자로 파싱되면 숫자로 저장한다. */
function coerceToColumnType(value: CellValue, type: DataType | undefined): CellValue {
  if (type !== "number") return value;
  if (value === null || value === "") return null;
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

export function applyOperation(store: ColumnStore, op: Operation): ApplyResult {
  switch (op.kind) {
    case "editCell": {
      const prev = store.getCell(op.row, op.colId);
      const value = coerceToColumnType(op.value, store.getColumn(op.colId)?.type);
      return {
        store: store.setCell(op.row, op.colId, value),
        inverse: { kind: "editCell", colId: op.colId, row: op.row, value: prev },
      };
    }

    case "newColumn": {
      const next = store.addColumn(
        { id: op.id, name: op.name, type: op.type },
        () => op.fillValue,
      );
      return { store: next, inverse: { kind: "deleteColumn", colId: op.id } };
    }

    case "deleteColumn": {
      const col = store.getColumn(op.colId);
      if (!col) return { store, inverse: op };
      const restores: Operation[] = [
        { kind: "newColumn", id: col.id, name: col.name, type: col.type, fillValue: null },
        ...col.values.map(
          (v, row): Operation => ({ kind: "editCell", colId: col.id, row, value: v }),
        ),
      ];
      return {
        store: store.removeColumn(op.colId),
        inverse: { kind: "batch", ops: restores },
      };
    }

    case "renameColumn": {
      const prev = store.columns.find((c) => c.id === op.colId)?.name ?? op.name;
      return {
        store: store.renameColumn(op.colId, op.name),
        inverse: { kind: "renameColumn", colId: op.colId, name: prev },
      };
    }

    case "mergeColumns": {
      const sources = op.sourceIds.map((id) => store.getColumn(id));
      const next = store.addColumn(
        { id: op.newColumnId, name: op.newColumnName, type: "string" },
        (row) =>
          mergeValues(
            sources.map((c): CellValue => c?.values[row] ?? null),
            op.separator,
          ),
      );
      return { store: next, inverse: { kind: "deleteColumn", colId: op.newColumnId } };
    }

    case "splitColumn": {
      const source = store.getColumn(op.sourceId);
      if (!source) return { store, inverse: op };
      let next = store;
      op.newColumns.forEach((nc, idx) => {
        next = next.addColumn(
          { id: nc.id, name: nc.name, type: "string" },
          (row) => splitValue(source.values[row], op.separator, op.newColumns.length)[idx],
        );
      });
      return {
        store: next,
        inverse: {
          kind: "batch",
          ops: op.newColumns.map((nc) => ({ kind: "deleteColumn", colId: nc.id })),
        },
      };
    }

    case "splitColumnMap": {
      const source = store.getColumn(op.sourceId);
      if (!source) return { store, inverse: op };
      let next = store;
      for (const part of op.parts) {
        next = next.addColumn(
          { id: part.id, name: part.name, type: "string" },
          (row) => splitPiece(source.values[row], op.separator, part.index, op.mode ?? "separator"),
        );
      }
      return {
        store: next,
        inverse: {
          kind: "batch",
          ops: op.parts.map((part) => ({ kind: "deleteColumn", colId: part.id })),
        },
      };
    }

    case "formulaColumns": {
      const source = store.getColumn(op.sourceId);
      if (!source) return { store, inverse: op };
      let next = store;
      for (const c of op.columns) {
        next = next.addColumn(
          { id: c.id, name: c.name, type: "string" },
          (row) => {
            const v = source.values[row];
            const sv = v === null ? "" : String(v);
            const result = evalFormula(c.formula, { value: sv, parts: splitToPieces(sv, op.separator, op.mode) });
            return result === "" ? null : result;
          },
        );
      }
      return {
        store: next,
        inverse: { kind: "batch", ops: op.columns.map((c) => ({ kind: "deleteColumn", colId: c.id })) },
      };
    }

    case "deleteRows": {
      const removed = op.rows.map((index) => ({
        index,
        cells: Object.fromEntries(store.columns.map((c) => [c.id, store.getCell(index, c.id)])),
      }));
      return {
        store: store.removeRows(op.rows),
        inverse: { kind: "insertRows", rows: removed },
      };
    }

    case "insertRows": {
      return {
        store: store.insertRows(op.rows),
        inverse: { kind: "deleteRows", rows: op.rows.map((r) => r.index) },
      };
    }

    case "batch": {
      let next = store;
      const inverses: Operation[] = [];
      for (const sub of op.ops) {
        const res = applyOperation(next, sub);
        next = res.store;
        inverses.unshift(res.inverse);
      }
      return { store: next, inverse: { kind: "batch", ops: inverses } };
    }
  }
}
