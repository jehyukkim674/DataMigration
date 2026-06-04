import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";
import type { Operation } from "../ops/operations";

interface Props {
  store: ColumnStore;
  initialColId?: string;
  onApply: (op: Operation) => void;
  onClose: () => void;
}

const SAMPLE = 6;

function pieces(value: string, sep: string): string[] {
  return sep === "" ? [value] : value.split(sep);
}

export function SplitDialog({ store, initialColId, onApply, onClose }: Props) {
  const [colId, setColId] = useState<string>(initialColId ?? store.columns[0]?.id ?? "");
  const [sep, setSep] = useState<string>(" ");
  const colName = store.columns.find((c) => c.id === colId)?.name ?? "";

  // 샘플(비어있지 않은 값 최대 SAMPLE개) + 최대 조각 수.
  const samples = useMemo(() => {
    const out: string[] = [];
    for (let r = 0; r < store.rowCount && out.length < SAMPLE; r++) {
      const v = store.getCell(r, colId);
      if (v !== null && v !== "") out.push(String(v));
    }
    return out;
  }, [store, colId]);

  const maxPieces = useMemo(
    () => samples.reduce((m, s) => Math.max(m, pieces(s, sep).length), 0),
    [samples, sep],
  );

  const [cfg, setCfg] = useState<{ name: string; excluded: boolean }[]>([]);
  useEffect(() => {
    setCfg(
      Array.from({ length: maxPieces }, (_, i) => ({
        name: `${colName}_${i + 1}`,
        excluded: false,
      })),
    );
  }, [maxPieces, colName]);

  const apply = () => {
    const ts = Date.now();
    const parts = cfg
      .map((c, index) => ({ c, index }))
      .filter((x) => !x.c.excluded && x.c.name.trim() !== "")
      .map((x) => ({ index: x.index, id: `sp_${ts}_${x.index}`, name: x.c.name.trim() }));
    if (parts.length === 0) { onClose(); return; }
    onApply({ kind: "splitColumnMap", sourceId: colId, separator: sep, parts });
    onClose();
  };

  const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };
  const sepBtn = (label: string, val: string) => (
    <button style={sep === val ? { ...btn, background: "#daeaff", borderColor: "#7aa7e0" } : btn} onClick={() => setSep(val)}>{label}</button>
  );

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>컬럼 쪼개기 (미리보기)</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 14, overflow: "auto" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13 }}>
              대상 컬럼{" "}
              <select value={colId} onChange={(e) => setColId(e.target.value)} style={{ fontSize: 13 }}>
                {store.columns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
            <span style={{ fontSize: 13 }}>구분자</span>
            {sepBtn("공백", " ")}
            {sepBtn("쉼표 ,", ",")}
            {sepBtn("하이픈 -", "-")}
            <input value={sep} onChange={(e) => setSep(e.target.value)} placeholder="사용자 구분자" style={{ width: 90, fontSize: 13, padding: "2px 6px" }} />
          </div>

          {/* 미리보기: 원본 → 조각 */}
          <div style={{ border: "1px solid #eee", borderRadius: 6, overflow: "auto", marginBottom: 12 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <thead>
                <tr style={{ background: "#f5f5f7" }}>
                  <th style={th}>원본</th>
                  {Array.from({ length: maxPieces }, (_, i) => (
                    <th key={i} style={{ ...th, color: cfg[i]?.excluded ? "#bbb" : "#333", textDecoration: cfg[i]?.excluded ? "line-through" : "none" }}>
                      조각{i + 1}{cfg[i]?.name ? ` → ${cfg[i].name}` : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {samples.map((s, ri) => {
                  const ps = pieces(s, sep);
                  return (
                    <tr key={ri}>
                      <td style={{ ...td, color: "#666" }}>{s}</td>
                      {Array.from({ length: maxPieces }, (_, i) => (
                        <td key={i} style={{ ...td, color: cfg[i]?.excluded ? "#ccc" : "#222" }}>{ps[i] ?? ""}</td>
                      ))}
                    </tr>
                  );
                })}
                {samples.length === 0 && (
                  <tr><td style={td} colSpan={maxPieces + 1}>표시할 데이터가 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 조각별 컬럼명/제외 설정 */}
          <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>각 조각을 어떤 컬럼으로 만들지 지정 (제외 시 컬럼 생성 안 함)</div>
          {cfg.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
              <span style={{ width: 48, fontSize: 12, color: "#888" }}>조각{i + 1}</span>
              <input
                value={c.name}
                disabled={c.excluded}
                onChange={(e) => setCfg((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                placeholder="새 컬럼명"
                style={{ flex: 1, fontSize: 13, padding: "3px 6px", background: c.excluded ? "#f3f3f3" : "#fff" }}
              />
              <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
                <input type="checkbox" checked={c.excluded} onChange={(e) => setCfg((arr) => arr.map((x, j) => (j === i ? { ...x, excluded: e.target.checked } : x)))} />
                제외
              </label>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee" }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={apply}>적용</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #e5e5e5", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" };
