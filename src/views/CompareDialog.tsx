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

const LIMIT = 500;

export function CompareDialog({ current, snapshot, label, onClose }: Props) {
  const diff = useMemo(() => diffStores(current, snapshot), [current, snapshot]);
  const shown = diff.rowDiffs.slice(0, LIMIT);

  const rowVals = (store: ColumnStore, i: number) =>
    store.columns.slice(0, 6).map((c) => String(store.getCell(i, c.id) ?? "")).filter((s) => s !== "").join(" · ");

  const badge = (text: string, color: string, bg: string) => (
    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, color, background: bg, marginRight: 6 }}>{text}</span>
  );

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 820, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>스냅샷 비교 · {label}</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: "10px 14px", borderBottom: "1px solid #eee" }}>
          {badge(`변경 ${diff.changedCellCount}셀`, "#8a6d00", "#fff3b0")}
          {badge(`추가 ${diff.addedRows}행`, "#1f7a3d", "#d8f0df")}
          {badge(`삭제 ${diff.removedRows}행`, "#c0392b", "#fbe0dc")}
          {diff.columnsAdded.length > 0 && badge(`컬럼+ ${diff.columnsAdded.join(", ")}`, "#1f7a3d", "#d8f0df")}
          {diff.columnsRemoved.length > 0 && badge(`컬럼- ${diff.columnsRemoved.join(", ")}`, "#c0392b", "#fbe0dc")}
          {diff.rowDiffs.length === 0 && diff.columnsAdded.length === 0 && diff.columnsRemoved.length === 0 && (
            <span style={{ fontSize: 13, color: "#888" }}>차이 없음 (스냅샷과 동일)</span>
          )}
        </div>

        <div style={{ overflow: "auto", padding: 10 }}>
          {shown.map((rd) => {
            const bg = rd.status === "added" ? "#f1fbf4" : rd.status === "removed" ? "#fdf2f0" : "#fffdf0";
            return (
              <div key={`${rd.status}-${rd.index}`} style={{ display: "flex", gap: 8, padding: "5px 8px", background: bg, borderRadius: 5, marginBottom: 3, fontSize: 12, alignItems: "baseline" }}>
                <span style={{ width: 54, color: "#999", flex: "0 0 auto" }}>행 {rd.index + 1}</span>
                {rd.status === "added" && (
                  <span style={{ color: "#1f7a3d" }}>＋ 추가됨: {rowVals(current, rd.index)}</span>
                )}
                {rd.status === "removed" && (
                  <span style={{ color: "#c0392b" }}>－ 삭제됨: {rowVals(snapshot, rd.index)}</span>
                )}
                {rd.status === "changed" && (
                  <span style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                    {rd.changes?.map((ch, i) => (
                      <span key={i}>
                        <b>{ch.col}</b>:{" "}
                        <span style={{ color: "#c0392b", textDecoration: "line-through" }}>{String(ch.before ?? "∅")}</span>
                        {" → "}
                        <span style={{ color: "#1f7a3d" }}>{String(ch.after ?? "∅")}</span>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
          {diff.rowDiffs.length > LIMIT && (
            <div style={{ color: "#999", fontSize: 12, padding: 6 }}>…외 {(diff.rowDiffs.length - LIMIT).toLocaleString()}개 행 차이</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px", borderTop: "1px solid #eee" }}>
          <button onClick={onClose} style={{ padding: "6px 16px", fontSize: 13, background: "#2f7ae0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>닫기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
