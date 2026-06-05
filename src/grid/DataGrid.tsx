import "@glideapps/glide-data-grid/dist/index.css";
import {
  CompactSelection,
  type DataEditorRef,
  type DrawHeaderCallback,
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type GridColumn,
  type GridSelection,
  type Item,
  type Rectangle,
  DataEditor,
} from "@glideapps/glide-data-grid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnStore } from "../data/ColumnStore";
import type { VisibleColumn } from "../view/computeView";
import type { SortDir } from "../view/viewState";
import { Minimap } from "./Minimap";
import { RowDeleteConfirm } from "./RowDeleteConfirm";

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
  onDeleteRows?: (rows: number[]) => void;
  onDeleteColumns?: (colIds: string[]) => void;
  headerLabel?: "alias" | "name" | "both";
  showMinimap?: boolean;
  onActiveCell?: (info: { col: number; row: number } | null) => void;
}

const ACCENT = "#2f7ae0";
const MUTED = "#8b909a";

/** 앞뒤 공백을 보이는 특수문자(␣)로 치환(표시 전용). 내부 공백/탭도 포함. */
function markEdgeSpaces(s: string): string {
  if (s === "") return s;
  const lead = s.length - s.trimStart().length;
  const trail = s.length - s.trimEnd().length;
  if (lead === 0 && trail === 0) return s;
  const core = s.slice(lead, s.length - trail);
  return "␣".repeat(lead) + core + "␣".repeat(trail);
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
  store, visibleColumns, rowOrder, sorts, filteredCols, onEditCell, onHeaderMenu, onHeaderClick, onReorder, onDeleteRows, onDeleteColumns,
  headerLabel = "alias", showMinimap = true, onActiveCell,
}: Props) {
  // 컬럼 폭은 그리드 로컬 상태로만 보관 → 리사이즈가 상위 리렌더/뷰 재계산을 일으키지 않음(성능).
  const [widths, setWidths] = useState<Record<string, number>>({});

  const columns: GridColumn[] = useMemo(
    () =>
      visibleColumns.map((c) => {
        const title =
          headerLabel === "name" || !c.alias
            ? c.name
            : headerLabel === "both"
              ? `${c.alias} (${c.name})`
              : c.alias;
        return { title, id: c.id, width: widths[c.id] ?? 120, hasMenu: !!onHeaderMenu };
      }),
    [visibleColumns, onHeaderMenu, widths, headerLabel],
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

  // ── Cmd+F 검색 상태(getCellContent 하이라이트에서 사용하므로 먼저 선언) ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ col: number; row: number }[]>([]);
  const [matchIdx, setMatchIdx] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 행/열 선택(체크박스 다중 + 헤더 선택).
  const [gridSelection, setGridSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });
  const selectedRows = useMemo(() => gridSelection.rows.toArray(), [gridSelection]);
  const selectedCols = useMemo(() => gridSelection.columns.toArray(), [gridSelection]);
  const handleSelectionChange = useCallback(
    (sel: GridSelection) => {
      setGridSelection(sel);
      const cell = sel.current?.cell;
      onActiveCell?.(cell ? { col: cell[0], row: cell[1] } : null);
    },
    [onActiveCell],
  );
  const clearSelection = useCallback(
    () => setGridSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() }),
    [],
  );
  const matchSet = useMemo(() => new Set(matches.map((m) => `${m.col},${m.row}`)), [matches]);
  const matchRows = useMemo(() => Array.from(new Set(matches.map((m) => m.row))), [matches]);
  const currentKey = matches[matchIdx] ? `${matches[matchIdx].col},${matches[matchIdx].row}` : "";

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const colMeta = visibleColumns[col];
      const srcRow = rowOrder[row];
      // 컬럼/행 변경 직후 stale 인덱스로 호출될 수 있어 방어(빈 셀 반환).
      if (!colMeta || srcRow === undefined) {
        return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false };
      }
      const raw = store.getCell(srcRow, colMeta.id);
      const text = raw === null ? "" : String(raw);
      // 앞뒤 공백은 보이는 특수문자(␣)로 표기하되, 실제 데이터(data)는 원본 유지.
      const base: GridCell = { kind: GridCellKind.Text, data: text, displayData: markEdgeSpaces(text), allowOverlay: true };
      const key = `${col},${row}`;
      if (key === currentKey) return { ...base, themeOverride: { bgCell: "#ffb454" } };
      if (matchSet.has(key)) return { ...base, themeOverride: { bgCell: "#fff3b0" } };
      return base;
    },
    [store, visibleColumns, rowOrder, matchSet, currentKey],
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

  // ── Cmd+F 검색 효과/핸들러 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.select());
      } else if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setQuery("");
        setMatches([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  // 일치 셀 계산(디바운스, 최대 5000).
  useEffect(() => {
    if (!searchOpen || query.trim() === "") { setMatches([]); return; }
    const q = query.toLowerCase();
    const t = setTimeout(() => {
      const found: { col: number; row: number }[] = [];
      const cap = 5000;
      for (let row = 0; row < rowOrder.length && found.length < cap; row++) {
        const src = rowOrder[row];
        for (let col = 0; col < visibleColumns.length; col++) {
          const v = store.getCell(src, visibleColumns[col].id);
          if (v !== null && String(v).toLowerCase().includes(q)) {
            found.push({ col, row });
            if (found.length >= cap) break;
          }
        }
      }
      setMatches(found);
      setMatchIdx(0);
      if (found.length) gridRef.current?.scrollTo(found[0].col, found[0].row, "both");
    }, 250);
    return () => clearTimeout(t);
  }, [query, searchOpen, store, rowOrder, visibleColumns]);

  const goMatch = useCallback((dir: 1 | -1) => {
    setMatchIdx((cur) => {
      if (matches.length === 0) return 0;
      const idx = (cur + dir + matches.length) % matches.length;
      gridRef.current?.scrollTo(matches[idx].col, matches[idx].row, "both");
      return idx;
    });
  }, [matches]);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", minHeight: 0, overflow: "hidden" }}>
      <div ref={wrapRef} style={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0, height: "100%" }}>
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
          gridSelection={gridSelection}
          onGridSelectionChange={handleSelectionChange}
          rowSelect="multi"
          columnSelect="multi"
          drawHeader={drawHeader}
          rowMarkers="both"
          theme={theme}
          rowHeight={24}
          headerHeight={28}
          smoothScrollX
          smoothScrollY
          width="100%"
          height="100%"
        />
        {searchOpen && (
          <div
            style={{
              position: "absolute", top: 6, right: 10, zIndex: 30,
              display: "flex", alignItems: "center", gap: 4,
              background: "#fff", border: "1px solid #c9c9cf", borderRadius: 8,
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)", padding: "4px 6px",
            }}
          >
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); goMatch(e.shiftKey ? -1 : 1); }
                else if (e.key === "Escape") { setSearchOpen(false); setQuery(""); setMatches([]); }
              }}
              placeholder="검색 (Cmd+F)"
              autoFocus
              style={{ border: "none", outline: "none", fontSize: 13, width: 160, padding: "2px 4px" }}
            />
            <span style={{ fontSize: 12, color: "#888", minWidth: 56, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {matches.length === 0 ? "0" : `${matchIdx + 1}/${matches.length}${matches.length >= 5000 ? "+" : ""}`}
            </span>
            <button onClick={() => goMatch(-1)} title="이전(Shift+Enter)" style={searchBtn}>↑</button>
            <button onClick={() => goMatch(1)} title="다음(Enter)" style={searchBtn}>↓</button>
            {onDeleteRows && matches.length > 0 && (
              <button
                onClick={() => setPendingDelete(Array.from(new Set(matches.map((m) => rowOrder[m.row]))).sort((a, b) => a - b))}
                title="검색된 행 삭제"
                style={{ ...searchBtn, color: "#c0392b", borderColor: "#e0a8a0" }}
              >
                🗑 행 삭제
              </button>
            )}
            <button onClick={() => { setSearchOpen(false); setQuery(""); setMatches([]); }} title="닫기(Esc)" style={searchBtn}>✕</button>
          </div>
        )}
        {(selectedRows.length > 0 || selectedCols.length > 0) && (onDeleteRows || onDeleteColumns) && (
          <div
            style={{
              position: "absolute", top: 6, left: 10, zIndex: 30,
              display: "flex", alignItems: "center", gap: 6,
              background: "#fff", border: "1px solid #c9c9cf", borderRadius: 8,
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)", padding: "4px 8px", fontSize: 12,
            }}
          >
            {selectedRows.length > 0 && (
              <>
                <span style={{ color: "#555" }}>✓ {selectedRows.length}행</span>
                {onDeleteRows && (
                  <button
                    style={{ ...searchBtn, color: "#c0392b", borderColor: "#e0a8a0" }}
                    onClick={() => setPendingDelete(Array.from(new Set(selectedRows.map((r) => rowOrder[r]))).sort((a, b) => a - b))}
                  >🗑 행 삭제</button>
                )}
              </>
            )}
            {selectedCols.length > 0 && onDeleteColumns && (
              <>
                <span style={{ color: "#555" }}>‖ {selectedCols.length}열</span>
                <button
                  style={{ ...searchBtn, color: "#c0392b", borderColor: "#e0a8a0" }}
                  onClick={() => {
                    const ids = selectedCols.map((i) => visibleColumns[i]?.id).filter(Boolean) as string[];
                    const names = selectedCols.map((i) => visibleColumns[i]?.name).filter(Boolean).join(", ");
                    if (ids.length && confirm(`${ids.length}개 열을 삭제할까요?\n${names}`)) {
                      onDeleteColumns(ids);
                      clearSelection();
                    }
                  }}
                >🗑 열 삭제</button>
              </>
            )}
            <button style={searchBtn} onClick={clearSelection} title="선택 해제">✕</button>
          </div>
        )}
      </div>
      {showMinimap && rowOrder.length > 0 && (
        <Minimap
          store={store}
          visibleColumns={visibleColumns}
          rowOrder={rowOrder}
          range={visRange}
          matchRows={matchRows}
          onJump={onJump}
        />
      )}
      {pendingDelete && onDeleteRows && (
        <RowDeleteConfirm
          store={store}
          columns={visibleColumns}
          rows={pendingDelete}
          onConfirm={() => {
            onDeleteRows(pendingDelete);
            setPendingDelete(null);
            setSearchOpen(false);
            setQuery("");
            setMatches([]);
            clearSelection();
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

const searchBtn: React.CSSProperties = {
  border: "1px solid #ddd", background: "#fff", borderRadius: 4, cursor: "pointer",
  fontSize: 12, lineHeight: "16px", padding: "0 6px", color: "#555",
};
