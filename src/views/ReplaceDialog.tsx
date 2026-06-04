import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";
import type { Operation } from "../ops/operations";
import { replaceCell } from "../ops/transforms";
import { Select } from "../ui/Select";

interface Props {
  store: ColumnStore;
  colId: string;
  onApply: (op: Operation) => void;
  onClose: () => void;
}

const SAMPLE = 30;

export function ReplaceDialog({ store, colId, onApply, onClose }: Props) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [regex, setRegex] = useState(false);
  const [cid, setCid] = useState(colId);
  const colName = store.columns.find((c) => c.id === cid)?.name ?? "";

  const col = useMemo(() => store.getColumn(cid), [store, cid]);

  // 변경되는 셀 + 미리보기 샘플.
  const { changedCount, preview } = useMemo(() => {
    const values = col?.values ?? [];
    let changed = 0;
    const pv: { before: string; after: string }[] = [];
    for (const v of values) {
      if (v === null || v === "") continue;
      const before = String(v);
      const afterCell = find.trim() === "" ? v : replaceCell(v, find, replace, regex);
      const after = afterCell === null ? "" : String(afterCell);
      if (before !== after) {
        changed++;
        if (pv.length < SAMPLE) pv.push({ before, after });
      }
    }
    return { changedCount: changed, preview: pv };
  }, [col, find, replace, regex]);

  const apply = () => {
    if (find.trim() === "") { onClose(); return; }
    onApply({ kind: "replaceInColumn", colId: cid, find, replace, regex });
    onClose();
  };

  const btn: React.CSSProperties = { padding: "5px 12px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(820px, 94vw)", height: "min(720px, 90vh)", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>찾기/바꾸기 — 컬럼</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            <span style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
              대상 컬럼
              <Select value={cid} options={store.columns.map((c) => ({ value: c.id, label: c.name }))} onChange={setCid} searchable width={220} aria-label="대상 컬럼" />
            </span>
            <label style={{ fontSize: 13, display: "flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} /> 정규식
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 13, width: 40 }}>찾기</span>
            <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={regex ? "정규식 (예: [0-9]+)" : "찾을 텍스트"} style={{ flex: 1, fontSize: 13, padding: "6px 8px", fontFamily: regex ? "monospace" : undefined, border: "1px solid #ccc", borderRadius: 5 }} autoFocus />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 13, width: 40 }}>바꿈</span>
            <input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="바꿀 텍스트 (비우면 삭제)" style={{ flex: 1, fontSize: 13, padding: "6px 8px", border: "1px solid #ccc", borderRadius: 5 }} />
          </div>

          <div style={{ fontSize: 13, color: changedCount ? "#1f7a3d" : "#888", flexShrink: 0 }}>
            {find.trim() === "" ? "찾을 텍스트를 입력하세요" : `${colName} 컬럼에서 ${changedCount.toLocaleString()}개 셀이 변경됩니다`}
          </div>

          <div style={{ flex: 1, minHeight: 80, border: "1px solid #eee", borderRadius: 6, overflow: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <thead>
                <tr style={{ background: "#f5f5f7" }}>
                  <th style={th}>원본</th>
                  <th style={th}>결과</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...td, color: "#c0392b" }}>{p.before}</td>
                    <td style={{ ...td, color: "#1f7a3d" }}>{p.after || "∅"}</td>
                  </tr>
                ))}
                {preview.length === 0 && (<tr><td style={td} colSpan={2}>{find.trim() === "" ? "—" : "변경될 셀이 없습니다"}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={apply} disabled={find.trim() === "" || changedCount === 0}>모두 바꾸기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #e5e5e5", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#f5f5f7" };
const td: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis" };
