import { ColumnStore } from "../data/ColumnStore";
import type { CellValue } from "../data/types";
import type { Operation } from "./operations";
import { mergeValues, splitValue } from "./transforms";

export interface ApplyResult {
  store: ColumnStore;
  inverse: Operation;
}

export function applyOperation(store: ColumnStore, op: Operation): ApplyResult {
  switch (op.kind) {
    case "editCell": {
      const prev = store.getCell(op.row, op.colId);
      return {
        store: store.setCell(op.row, op.colId, op.value),
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
