import "@glideapps/glide-data-grid/dist/index.css";
import {
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type GridColumn,
  type Item,
  DataEditor,
} from "@glideapps/glide-data-grid";
import { useCallback, useMemo } from "react";
import type { ColumnStore } from "../data/ColumnStore";

interface Props {
  store: ColumnStore;
  onEditCell: (row: number, colId: string, value: string) => void;
}

export function DataGrid({ store, onEditCell }: Props) {
  const columns: GridColumn[] = useMemo(
    () => store.columns.map((c) => ({ title: c.name, id: c.id, width: 160 })),
    [store],
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const colMeta = store.columns[col];
      const raw = store.getCell(row, colMeta.id);
      const text = raw === null ? "" : String(raw);
      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        allowOverlay: true,
      };
    },
    [store],
  );

  const onCellEdited = useCallback(
    ([col, row]: Item, newValue: EditableGridCell) => {
      if (newValue.kind !== GridCellKind.Text) return;
      const colMeta = store.columns[col];
      onEditCell(row, colMeta.id, newValue.data);
    },
    [store, onEditCell],
  );

  return (
    <DataEditor
      columns={columns}
      rows={store.rowCount}
      getCellContent={getCellContent}
      onCellEdited={onCellEdited}
      smoothScrollX
      smoothScrollY
      width="100%"
      height="100%"
    />
  );
}
