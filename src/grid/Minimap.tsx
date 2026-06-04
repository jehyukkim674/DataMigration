import { useEffect, useRef, useState } from "react";
import type { ColumnStore } from "../data/ColumnStore";
import type { VisibleColumn } from "../view/computeView";

interface Props {
  store: ColumnStore;
  visibleColumns: VisibleColumn[];
  rowOrder: number[];
  range: { start: number; end: number };
  matchRows?: number[];
  onJump: (row: number) => void;
}

const WIDTH = 56;
const MAX_COLS = 24;

/** 그리드 우측의 데이터 개요 미니맵: 채워진 셀 밀도 + 현재 보기 영역 + 클릭/드래그 이동. */
export function Minimap({ store, visibleColumns, rowOrder, range, matchRows, onJump }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = rowOrder.length;
  const [h, setH] = useState(0);

  // 컨테이너 높이 추적(창 리사이즈 대응).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => setH(Math.max(1, Math.floor(wrap.clientHeight)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // 데이터 맵 + 검색 마커 그리기(데이터/크기/검색 변경 시).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || h === 0) return;
    canvas.width = WIDTH;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, h);
    if (rows === 0) return;
    const cols = visibleColumns.slice(0, MAX_COLS);
    const colW = WIDTH / Math.max(1, cols.length);
    for (let y = 0; y < h; y++) {
      const dataRow = Math.min(rows - 1, Math.floor((y / h) * rows));
      const srcRow = rowOrder[dataRow];
      for (let ci = 0; ci < cols.length; ci++) {
        const v = store.getCell(srcRow, cols[ci].id);
        const empty = v === null || v === "";
        ctx.fillStyle = empty ? "#eef0f2" : "#9bb8e0";
        ctx.fillRect(ci * colW, y, Math.ceil(colW), 1);
      }
    }
    // 검색 일치 행 마커(주황).
    if (matchRows && matchRows.length) {
      ctx.fillStyle = "#ff8c1a";
      for (const r of matchRows) {
        const y = Math.min(h - 2, Math.floor((r / rows) * h));
        ctx.fillRect(0, y, WIDTH, 2);
      }
    }
  }, [store, visibleColumns, rowOrder, rows, h, matchRows]);

  const jumpFromEvent = (clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap || rows === 0) return;
    const rect = wrap.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    onJump(Math.floor(rel * rows));
  };

  const onDown = (e: React.MouseEvent) => {
    jumpFromEvent(e.clientY);
    const move = (ev: MouseEvent) => jumpFromEvent(ev.clientY);
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const topPct = rows ? (range.start / rows) * 100 : 0;
  const hPct = rows ? Math.max(2, ((range.end - range.start) / rows) * 100) : 0;

  return (
    <div
      ref={wrapRef}
      onMouseDown={onDown}
      style={{ position: "relative", width: WIDTH, height: "100%", borderLeft: "1px solid #e3e3e6", cursor: "pointer", background: "#fafafb", flex: "0 0 auto" }}
      title="클릭/드래그로 이동"
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: WIDTH, height: "100%" }} />
      <div
        style={{
          position: "absolute", left: 0, right: 0,
          top: `${topPct}%`, height: `${hPct}%`,
          background: "rgba(47,122,224,0.18)", border: "1px solid rgba(47,122,224,0.6)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
