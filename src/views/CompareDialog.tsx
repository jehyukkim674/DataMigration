import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";
import { diffStores } from "../ops/diff";

interface Props {
  current: ColumnStore;
  snapshot: ColumnStore;
  label: string;
  onClose: () => void;
}

const ROW_LIMIT = 300;

type ColStatus = "common" | "added" | "removed";
interface Col { id: string; name: string; store: ColumnStore; status: ColStatus }

export function CompareDialog({ current, snapshot, label, onClose }: Props) {
  const diff = useMemo(() => diffStores(current, snapshot), [current, snapshot]);

  const cols: Col[] = useMemo(() => {
    const snapNames = new Set(snapshot.columns.map((c) => c.name));
    const curNames = new Set(current.columns.map((c) => c.name));
    return [
      ...current.columns.map<Col>((c) => ({ id: c.id, name: c.name, store: current, status: snapNames.has(c.name) ? "common" : "added" })),
      ...snapshot.columns.filter((c) => !curNames.has(c.name)).map<Col>((c) => ({ id: c.id, name: c.name, store: snapshot, status: "removed" })),
    ];
  }, [current, snapshot]);

  const rowN = Math.min(ROW_LIMIT, Math.max(current.rowCount, snapshot.rowCount));

  const headBg = (s: ColStatus) => (s === "added" ? "#d8f0df" : s === "removed" ? "#fbe0dc" : "#f1f3f6");
  const headColor = (s: ColStatus) => (s === "added" ? "#1f7a3d" : s === "removed" ? "#c0392b" : "#333");

  const badge = (text: string, color: string, bg: string) => (
    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, color, background: bg, marginRight: 6 }}>{text}</span>
  );

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(1280px, 96vw)", height: "min(860px, 92vh)", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>스냅샷 비교 · {label}</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: "10px 14px", borderBottom: "1px solid #eee", flexShrink: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
          {diff.columnsAdded.length > 0 && badge(`추가 컬럼: ${diff.columnsAdded.join(", ")}`, "#1f7a3d", "#d8f0df")}
          {diff.columnsRemoved.length > 0 && badge(`삭제 컬럼: ${diff.columnsRemoved.join(", ")}`, "#c0392b", "#fbe0dc")}
          {badge(`추가 ${diff.addedRows}행`, "#1f7a3d", "#eef7f0")}
          {badge(`삭제 ${diff.removedRows}행`, "#c0392b", "#fcefed")}
          {badge(`변경 ${diff.changedCellCount}셀`, "#8a6d00", "#fff3b0")}
          <span style={{ fontSize: 12, color: "#888", marginLeft: 6 }}>초록=추가된 컬럼, 빨강=삭제된 컬럼</span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...thBase, position: "sticky", left: 0, zIndex: 3, background: "#eef0f3", minWidth: 48 }}>행</th>
                {cols.map((c) => (
                  <th key={`${c.status}-${c.id}`} style={{ ...thBase, background: headBg(c.status), color: headColor(c.status) }} title={c.status === "added" ? "추가된 컬럼" : c.status === "removed" ? "삭제된 컬럼" : ""}>
                    {c.status === "added" ? "＋ " : c.status === "removed" ? "－ " : ""}{c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowN }, (_, i) => (
                <tr key={i}>
                  <td style={{ ...tdBase, position: "sticky", left: 0, background: "#fafbfc", color: "#999", zIndex: 1 }}>{i + 1}</td>
                  {cols.map((c) => {
                    const v = i < c.store.rowCount ? c.store.getCell(i, c.id) : null;
                    return (
                      <td key={`${c.status}-${c.id}`} style={{ ...tdBase, background: c.status === "added" ? "#f4fbf6" : c.status === "removed" ? "#fdf4f2" : "#fff" }}>
                        {v === null ? "" : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {cols.length === 0 && <tr><td style={tdBase}>표시할 컬럼이 없습니다</td></tr>}
            </tbody>
          </table>
          {Math.max(current.rowCount, snapshot.rowCount) > ROW_LIMIT && (
            <div style={{ color: "#999", fontSize: 12, padding: 8 }}>…처음 {ROW_LIMIT}행만 표시</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "6px 16px", fontSize: 13, background: "#2f7ae0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>닫기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const thBase: React.CSSProperties = { textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #d8dce2", borderRight: "1px solid #eef0f3", whiteSpace: "nowrap", position: "sticky", top: 0, fontWeight: 600, zIndex: 2 };
const tdBase: React.CSSProperties = { padding: "4px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f4f4f6", whiteSpace: "nowrap", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" };
