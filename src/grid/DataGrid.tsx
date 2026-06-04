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
import type { VisibleColumn } from "../view/computeView";

interface Props {
  store: ColumnStore;
  visibleColumns: VisibleColumn[];
  rowOrder: number[];
  onEditCell: (row: number, colId: string, value: string) => void;
  onHeaderMenu?: (colId: string, screenPos: { x: number; y: number }) => void;
}

export function DataGrid({ store, visibleColumns, rowOrder, onEditCell, onHeaderMenu }: Props) {
  const columns: GridColumn[] = useMemo(
    () => visibleColumns.map((c) => ({ title: c.name, id: c.id, width: 160, hasMenu: !!onHeaderMenu })),
    [visibleColumns, onHeaderMenu],
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const colMeta = visibleColumns[col];
      const srcRow = rowOrder[row];
      const raw = store.getCell(srcRow, colMeta.id);
      const text = raw === null ? "" : String(raw);
      return { kind: GridCellKind.Text, data: text, displayData: text, allowOverlay: true };
    },
    [store, visibleColumns, rowOrder],
  );

  const onCellEdited = useCallback(
    ([col, row]: Item, newValue: EditableGridCell) => {
      if (newValue.kind !== GridCellKind.Text) return;
      const colMeta = visibleColumns[col];
      onEditCell(rowOrder[row], colMeta.id, newValue.data);
    },
    [visibleColumns, rowOrder, onEditCell],
  );

  const onHeaderMenuClick = useCallback(
    (col: number, bounds: { x: number; y: number; width: number; height: number }) => {
      onHeaderMenu?.(visibleColumns[col].id, { x: bounds.x, y: bounds.y + bounds.height });
    },
    [visibleColumns, onHeaderMenu],
  );

  return (
    <DataEditor
      columns={columns}
      rows={rowOrder.length}
      getCellContent={getCellContent}
      onCellEdited={onCellEdited}
      onHeaderMenuClick={onHeaderMenuClick}
      smoothScrollX
      smoothScrollY
      width="100%"
      height="100%"
    />
  );
}
