interface Props {
  source?: string;
  visibleRows: number;
  totalRows: number;
  colCount: number;
  zoom: number;
  onZoom: (z: number) => void;
}

export function StatusBar({ source, visibleRows, totalRows, colCount, zoom, onZoom }: Props) {
  const pct = Math.round(zoom * 100);
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "4px 12px", borderTop: "1px solid #ddd",
        background: "#f7f7f8", fontSize: 12, color: "#555",
      }}
    >
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {source ? `📄 ${source}` : "파일 없음"}
      </span>
      <span>
        {visibleRows.toLocaleString()}
        {visibleRows !== totalRows ? ` / ${totalRows.toLocaleString()}` : ""} 행 · {colCount} 열
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => onZoom(zoom - 0.1)} title="축소" style={zbtn}>−</button>
        <input
          type="range" min={0.5} max={2} step={0.1} value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          style={{ width: 110 }}
        />
        <button onClick={() => onZoom(zoom + 0.1)} title="확대" style={zbtn}>＋</button>
        <button onClick={() => onZoom(1)} title="100%로" style={{ ...zbtn, width: 48 }}>{pct}%</button>
      </span>
    </div>
  );
}

const zbtn: React.CSSProperties = {
  border: "1px solid #ccc", background: "#fff", borderRadius: 4,
  cursor: "pointer", fontSize: 12, padding: "1px 6px", minWidth: 22,
};
