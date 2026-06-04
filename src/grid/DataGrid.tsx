import "@glideapps/glide-data-grid/dist/index.css";
import {
  type DrawHeaderCallback,
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
import type { SortDir } from "../view/viewState";

interface Props {
  store: ColumnStore;
  visibleColumns: VisibleColumn[];
  rowOrder: number[];
  sorts?: { colId: string; dir: SortDir }[];
  filteredCols?: string[];
  onEditCell: (row: number, colId: string, value: string) => void;
  onHeaderMenu?: (colId: string, screenPos: { x: number; y: number }) => void;
  onHeaderClick?: (colId: string) => void;
}

const ACCENT = "#2f7ae0";
const MUTED = "#b6b9c0";

/** 컬럼 타입 아이콘(작은 표 글리프). */
function drawColIcon(ctx: CanvasRenderingContext2D, x: number, cy: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, cy - 5.5, 9, 11);
  ctx.beginPath();
  ctx.moveTo(x + 4.5, cy - 5.5);
  ctx.lineTo(x + 4.5, cy + 5.5);
  ctx.stroke();
  ctx.restore();
}

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

/** 정렬 ⇅ (위=asc, 아래=desc). 활성 방향만 강조. */
function drawSortArrows(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: SortDir | undefined) {
  ctx.save();
  ctx.fillStyle = dir === "asc" ? ACCENT : MUTED;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5.5);
  ctx.lineTo(cx + 3, cy - 1.5);
  ctx.lineTo(cx - 3, cy - 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dir === "desc" ? ACCENT : MUTED;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 5.5);
  ctx.lineTo(cx + 3, cy + 1.5);
  ctx.lineTo(cx - 3, cy + 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 폭에 맞춰 말줄임표로 자른 텍스트. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

export function DataGrid({
  store, visibleColumns, rowOrder, sorts, filteredCols, onEditCell, onHeaderMenu, onHeaderClick,
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

      // 좌측 컬럼 아이콘
      drawColIcon(ctx, x + 6, cy, "#9aa0a6");

      // 우측 아이콘 클러스터: [정렬 ⇅] [필터 깔때기]
      const arrowsX = x + width - 9;
      const funnelX = arrowsX - 14;
      const dir = id ? sortMap.get(id) : undefined;
      drawSortArrows(ctx, arrowsX, cy, dir);
      drawFunnel(ctx, funnelX, cy, id && filterSet.has(id) ? ACCENT : MUTED);

      // 제목(아이콘 사이 영역, 말줄임)
      const titleX = x + 19;
      const maxW = Math.max(0, funnelX - 8 - titleX);
      ctx.fillStyle = t.textHeader;
      ctx.font = `${t.headerFontStyle} ${t.fontFamily}`;
      ctx.textBaseline = "middle";
      ctx.fillText(fitText(ctx, column.title, maxW), titleX, cy + 0.5);

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

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      <DataEditor
        columns={columns}
        rows={rowOrder.length}
        getCellContent={getCellContent}
        onCellEdited={onCellEdited}
        onHeaderMenuClick={onHeaderMenuClick}
        onHeaderClicked={onHeaderClicked}
        onColumnResize={onColumnResize}
        drawHeader={drawHeader}
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
