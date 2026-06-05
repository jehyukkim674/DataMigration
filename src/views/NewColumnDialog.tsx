import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";
import type { Operation } from "../ops/operations";
import { Select } from "../ui/Select";

interface Props {
  store: ColumnStore;
  onApply: (op: Operation) => void;
  onClose: () => void;
}

type Mode = "fixed" | "compare";
const SAMPLE = 14;
const has = (v: unknown) => v !== null && v !== "" && v !== undefined;

export function NewColumnDialog({ store, onApply, onClose }: Props) {
  const cols = store.columns;
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("compare");
  const [fillValue, setFillValue] = useState("");
  const [aColId, setACol] = useState(cols[0]?.id ?? "");
  const [bColId, setBCol] = useState(cols[1]?.id ?? cols[0]?.id ?? "");
  const [outputs, setOutputs] = useState({ both: "일치", onlyA: "A만 있음", onlyB: "B만 있음", neither: "둘다 없음" });

  const aName = cols.find((c) => c.id === aColId)?.name ?? "A";
  const bName = cols.find((c) => c.id === bColId)?.name ?? "B";

  const compute = (a: unknown, b: unknown) =>
    has(a) && has(b) ? outputs.both : has(a) ? outputs.onlyA : has(b) ? outputs.onlyB : outputs.neither;

  // 미리보기 샘플(가능하면 4경우가 다양하게 보이도록 앞에서부터).
  const samples = useMemo(() => {
    const out: { a: string; b: string; r: string }[] = [];
    for (let r = 0; r < store.rowCount && out.length < SAMPLE; r++) {
      const a = store.getCell(r, aColId);
      const b = store.getCell(r, bColId);
      out.push({ a: a === null ? "" : String(a), b: b === null ? "" : String(b), r: compute(a, b) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, aColId, bColId, outputs]);

  const apply = () => {
    const nm = name.trim();
    if (nm === "") return;
    const id = `c_${Date.now()}`;
    if (mode === "fixed") {
      onApply({ kind: "newColumn", id, name: nm, type: "string", fillValue: fillValue === "" ? null : fillValue });
    } else {
      onApply({ kind: "compareColumns", id, name: nm, aColId, bColId, outputs });
    }
    onClose();
  };

  const btn: React.CSSProperties = { padding: "5px 12px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };
  const onBtn: React.CSSProperties = { ...btn, background: "#daeaff", borderColor: "#7aa7e0" };
  const out = (k: keyof typeof outputs, label: string, color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ width: 130, fontSize: 13, color }}>{label}</span>
      <input value={outputs[k]} onChange={(e) => setOutputs((o) => ({ ...o, [k]: e.target.value }))} placeholder="(비우면 빈 값)" style={{ flex: 1, fontSize: 13, padding: "5px 8px", border: "1px solid #ccc", borderRadius: 5 }} />
    </div>
  );

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(720px, 95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>컬럼 생성</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 14, overflow: "auto" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13 }}>새 컬럼명</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="컬럼 이름" autoFocus style={{ flex: 1, minWidth: 180, fontSize: 13, padding: "6px 8px", border: "1px solid #ccc", borderRadius: 5 }} />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button style={mode === "compare" ? onBtn : btn} onClick={() => setMode("compare")}>두 컬럼 비교(조건)</button>
            <button style={mode === "fixed" ? onBtn : btn} onClick={() => setMode("fixed")}>고정 값</button>
          </div>

          {mode === "fixed" ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#888" }}>모든 행에 채울 값</span>
              <input value={fillValue} onChange={(e) => setFillValue(e.target.value)} placeholder="(비우면 빈 값)" style={{ flex: 1, fontSize: 13, padding: "6px 8px", border: "1px solid #ccc", borderRadius: 5 }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>두 컬럼의 <b>값 유무</b>를 비교해 경우별로 값을 채웁니다(마이그레이션 정합성 비교).</div>
              <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  컬럼 A
                  <Select value={aColId} options={cols.map((c) => ({ value: c.id, label: c.name }))} onChange={setACol} searchable width={200} aria-label="컬럼 A" />
                </span>
                <span style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  컬럼 B
                  <Select value={bColId} options={cols.map((c) => ({ value: c.id, label: c.name }))} onChange={setBCol} searchable width={200} aria-label="컬럼 B" />
                </span>
              </div>

              {out("both", "A·B 둘 다 있음", "#1f7a3d")}
              {out("onlyA", `A(${aName})만 있음`, "#2f6fed")}
              {out("onlyB", `B(${bName})만 있음`, "#e5774a")}
              {out("neither", "둘 다 없음", "#c0392b")}

              <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 6, overflow: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f7" }}>
                      <th style={th}>{aName}</th>
                      <th style={th}>{bName}</th>
                      <th style={{ ...th, color: "#2f6fed" }}>→ {name || "새 컬럼"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((s, i) => (
                      <tr key={i}>
                        <td style={{ ...td, color: s.a === "" ? "#bbb" : "#333" }}>{s.a === "" ? "(없음)" : s.a}</td>
                        <td style={{ ...td, color: s.b === "" ? "#bbb" : "#333" }}>{s.b === "" ? "(없음)" : s.b}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{s.r || "∅"}</td>
                      </tr>
                    ))}
                    {samples.length === 0 && <tr><td style={td} colSpan={3}>데이터 없음</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee" }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={apply} disabled={name.trim() === ""}>생성</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #e5e5e5", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#f5f5f7" };
const td: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" };
