import "@glideapps/glide-data-grid/dist/index.css";
import {
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type GridColumn,
  type Item,
  DataEditor,
} from "@glideapps/glide-data-grid";
import { useCallback, useMemo, useRef, useState } from "react";
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
  // 컬럼 폭은 그리드 로컬 상태로만 보관 → 리사이즈가 상위 리렌더/뷰 재계산을 일으키지 않음(성능).
  const [widths, setWidths] = useState<Record<string, number>>({});

  const columns: GridColumn[] = useMemo(
    () =>
      visibleColumns.map((c) => ({
        title: c.name,
        id: c.id,
        width: widths[c.id] ?? 120,
        hasMenu: !!onHeaderMenu,
      })),
    [visibleColumns, onHeaderMenu, widths],
  );

  const onColumnResize = useCallback((column: GridColumn, newSize: number) => {
    const id = column.id;
    if (!id) return;
    setWidths((w) => ({ ...w, [id]: newSize }));
  }, []);

  // 기본 셀/폰트를 작게(엑셀 느낌). 앱 전체 줌(Cmd +/-)은 RootView가 담당.
  const theme = useMemo(
    () => ({
      baseFontStyle: "12px",
      headerFontStyle: "600 12px",
      cellHorizontalPadding: 6,
    }),
    [],
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

  const wrapRef = useRef<HTMLDivElement>(null);
  const onHeaderMenuClick = useCallback(
    (col: number, bounds: { x: number; y: number; width: number; height: number }) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      onHeaderMenu?.(visibleColumns[col].id, {
        x: (rect?.left ?? 0) + bounds.x,
        y: (rect?.top ?? 0) + bounds.y + bounds.height,
      });
    },
    [visibleColumns, onHeaderMenu],
  );

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
    <DataEditor
      columns={columns}
      rows={rowOrder.length}
      getCellContent={getCellContent}
      onCellEdited={onCellEdited}
      onHeaderMenuClick={onHeaderMenuClick}
      onColumnResize={onColumnResize}
      theme={theme}
      rowHeight={24}
      headerHeight={28}
      smoothScrollX
      smoothScrollY
      width="100%"
      height="100%"
    />
    </div>
  );
}
