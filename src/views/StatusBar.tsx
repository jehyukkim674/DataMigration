interface Props {
  source?: string;
  visibleRows: number;
  totalRows: number;
  colCount: number;
  zoom: number;
  onZoom: (z: number) => void;
  cellInfo?: string;
}

export function StatusBar({ source, visibleRows, totalRows, colCount, zoom, onZoom, cellInfo }: Props) {
  const pct = Math.round(zoom * 100);
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "2px 10px", borderTop: "1px solid #ddd",
        background: "#f7f7f8", fontSize: 11, color: "#666",
        // 앱 줌(웹뷰 줌)을 상쇄해 하단 바는 항상 같은 크기로 보이게.
        zoom: 1 / zoom,
      }}
    >
      <span style={{ color: "#888" }}>준비</span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {source ? `📄 ${source}` : "파일 없음"}
      </span>
      {cellInfo && <span style={{ color: "#2f6fed", fontVariantNumeric: "tabular-nums" }}>📍 {cellInfo}</span>}
      <span title="표시 행(필터 적용 후) / 전체 행 · 열 수">
        표시 {visibleRows.toLocaleString()}
        {visibleRows !== totalRows ? ` / 전체 ${totalRows.toLocaleString()}` : ""} 행 · {colCount} 열
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => onZoom(zoom - 0.1)} title="축소" style={zbtn}>−</button>
        <input
          type="range" min={0.5} max={2} step={0.1} value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          style={{ width: 90, height: 12 }}
        />
        <button onClick={() => onZoom(zoom + 0.1)} title="확대" style={zbtn}>＋</button>
        <button onClick={() => onZoom(1)} title="100%로 재설정" style={{ ...zbtn, minWidth: 38, fontVariantNumeric: "tabular-nums" }}>{pct}%</button>
      </span>
    </div>
  );
}

const zbtn: React.CSSProperties = {
  border: "1px solid #d5d5d8", background: "#fff", borderRadius: 3,
  cursor: "pointer", fontSize: 11, padding: "0 5px", minWidth: 18, lineHeight: "16px", color: "#555",
};
