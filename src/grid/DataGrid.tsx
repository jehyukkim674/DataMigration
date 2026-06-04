import "@glideapps/glide-data-grid/dist/index.css";
import {
  type DataEditorRef,
  type DrawHeaderCallback,
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type GridColumn,
  type Item,
  type Rectangle,
  DataEditor,
} from "@glideapps/glide-data-grid";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ColumnStore } from "../data/ColumnStore";
import type { VisibleColumn } from "../view/computeView";
import type { SortDir } from "../view/viewState";
import { Minimap } from "./Minimap";

interface Props {
  store: ColumnStore;
  visibleColumns: VisibleColumn[];
  rowOrder: number[];
  sorts?: { colId: string; dir: SortDir }[];
  filteredCols?: string[];
  onEditCell: (row: number, colId: string, value: string) => void;
  onHeaderMenu?: (colId: string, screenPos: { x: number; y: number }) => void;
  onHeaderClick?: (colId: string) => void;
  onReorder?: (from: number, to: number) => void;
}

const ACCENT = "#2f7ae0";
const MUTED = "#8b909a";

/** 필터 깔때기(외곽선). */
function drawFunnel(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 4.5);
  ctx.lineTo(cx + 5, cy - 4.5);
  ctx.lineTo(cx + 1.3, cy + 0.3);
  ctx.lineTo(cx + 1.3, cy + 5);
  ctx.lineTo(cx - 1.3, cy + 3.6);
  ctx.lineTo(cx - 1.3, cy + 0.3);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** 셰브론(^ 또는 v). */
function chevron(ctx: CanvasRenderingContext2D, cx: number, cy: number, up: boolean, color: string, w = 4, h = 3) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (up) {
    ctx.moveTo(cx - w, cy + h / 2);
    ctx.lineTo(cx, cy - h / 2);
    ctx.lineTo(cx + w, cy + h / 2);
  } else {
    ctx.moveTo(cx - w, cy - h / 2);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx + w, cy - h / 2);
  }
  ctx.stroke();
  ctx.restore();
}

/** 정렬 표시: 미정렬=흐린 ⇅, asc=강조 ^, desc=강조 v. */
function drawSort(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: SortDir | undefined) {
  if (dir === "asc") chevron(ctx, cx, cy, true, ACCENT, 4.5, 4);
  else if (dir === "desc") chevron(ctx, cx, cy, false, ACCENT, 4.5, 4);
  else {
    chevron(ctx, cx, cy - 3, true, MUTED, 3.5, 3);
    chevron(ctx, cx, cy + 3, false, MUTED, 3.5, 3);
  }
}

/** 폭에 맞춰 말줄임표로 자른 텍스트. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

export function DataGrid({
  store, visibleColumns, rowOrder, sorts, filteredCols, onEditCell, onHeaderMenu, onHeaderClick, onReorder,
}: Props) {
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

  const sortMap = useMemo(() => new Map((sorts ?? []).map((s) => [s.colId, s.dir])), [sorts]);
  const filterSet = useMemo(() => new Set(filteredCols ?? []), [filteredCols]);

  const onColumnResize = useCallback((column: GridColumn, newSize: number) => {
    const id = column.id;
    if (!id) return;
    setWidths((w) => ({ ...w, [id]: newSize }));
  }, []);

  const theme = useMemo(
    () => ({ baseFontStyle: "12px", headerFontStyle: "600 12px", cellHorizontalPadding: 6 }),
    [],
  );

  // 헤더를 직접 그려 정렬 화살표 + 필터 깔때기 아이콘 표시.
  const drawHeader = useCallback<DrawHeaderCallback>(
    (a) => {
      const { ctx, rect, column } = a;
      const t = a.theme;
      const { x, y, width, height } = rect;
      const cy = y + height / 2;
      const id = column.id;

      ctx.save();
      ctx.fillStyle = a.hoverAmount > 0 ? t.bgHeaderHovered : t.bgHeader;
      ctx.fillRect(x, y, width, height);

      // 맨 오른쪽 = 필터 깔때기(메뉴 클릭 영역).
      const funnelX = x + width - 10;
      drawFunnel(ctx, funnelX, cy, id && filterSet.has(id) ? ACCENT : MUTED);

      // 제목(좌측, 말줄임) + 그 옆에 정렬 아이콘.
      const titleX = x + 6;
      const maxTextW = Math.max(0, funnelX - 26 - titleX);
      ctx.fillStyle = t.textHeader;
      ctx.font = `${t.headerFontStyle} ${t.fontFamily}`;
      ctx.textBaseline = "middle";
      const drawn = fitText(ctx, column.title, maxTextW);
      ctx.fillText(drawn, titleX, cy + 0.5);

      const dir = id ? sortMap.get(id) : undefined;
      const textW = ctx.measureText(drawn).width;
      const sortX = Math.min(titleX + textW + 9, funnelX - 13);
      drawSort(ctx, sortX, cy, dir);

      ctx.restore();
      return true;
    },
    [sortMap, filterSet],
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

  const onHeaderClicked = useCallback(
    (col: number) => onHeaderClick?.(visibleColumns[col].id),
    [visibleColumns, onHeaderClick],
  );

  // 헤더 위에서는 클릭 가능함을 알리는 손가락 커서.
  const onItemHovered = useCallback((args: { kind: string }) => {
    if (wrapRef.current) wrapRef.current.style.cursor = args.kind === "header" ? "pointer" : "default";
  }, []);

  // 미니맵: 보이는 행 범위 추적 + 클릭 시 스크롤 이동.
  const gridRef = useRef<DataEditorRef>(null);
  const [visRange, setVisRange] = useState({ start: 0, end: 0 });
  const onVisibleRegionChanged = useCallback((r: Rectangle) => {
    setVisRange({ start: r.y, end: r.y + r.height });
  }, []);
  const onJump = useCallback((row: number) => {
    gridRef.current?.scrollTo(0, row, "vertical");
  }, []);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <div ref={wrapRef} style={{ flex: 1, minWidth: 0, height: "100%" }}>
        <DataEditor
          ref={gridRef}
          columns={columns}
          rows={rowOrder.length}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderClicked={onHeaderClicked}
          onItemHovered={onItemHovered}
          onColumnResize={onColumnResize}
          onColumnMoved={onReorder}
          onVisibleRegionChanged={onVisibleRegionChanged}
          drawHeader={drawHeader}
          rowMarkers="number"
          theme={theme}
          rowHeight={24}
          headerHeight={28}
          smoothScrollX
          smoothScrollY
          width="100%"
          height="100%"
        />
      </div>
      {rowOrder.length > 0 && (
        <Minimap
          store={store}
          visibleColumns={visibleColumns}
          rowOrder={rowOrder}
          range={visRange}
          onJump={onJump}
        />
      )}
    </div>
  );
}
