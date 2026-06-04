import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";
import type { Operation } from "../ops/operations";
import { splitToPieces, type SplitMode } from "../ops/transforms";
import { evalFormula, validateFormula } from "../ops/formula";
import { FormulaEditor } from "./FormulaEditor";

interface Props {
  store: ColumnStore;
  initialColId?: string;
  onApply: (op: Operation) => void;
  onClose: () => void;
}

const SAMPLE = 30;

interface Cfg {
  name: string;
  excluded: boolean;
  formula: string;
}

export function SplitDialog({ store, initialColId, onApply, onClose }: Props) {
  const [colId, setColId] = useState<string>(initialColId ?? store.columns[0]?.id ?? "");
  const [sep, setSep] = useState<string>(" ");
  const [mode, setMode] = useState<SplitMode>("separator");
  const [useFormula, setUseFormula] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const colName = store.columns.find((c) => c.id === colId)?.name ?? "";

  const samples = useMemo(() => {
    const out: string[] = [];
    for (let r = 0; r < store.rowCount && out.length < SAMPLE; r++) {
      const v = store.getCell(r, colId);
      if (v !== null && v !== "") out.push(String(v));
    }
    return out;
  }, [store, colId]);

  const maxPieces = useMemo(
    () => Math.max(1, samples.reduce((m, s) => Math.max(m, splitToPieces(s, sep, mode).length), 0)),
    [samples, sep, mode],
  );

  const [cfg, setCfg] = useState<Cfg[]>([]);
  useEffect(() => {
    setCfg(Array.from({ length: maxPieces }, (_, i) => ({ name: `${colName}_${i + 1}`, excluded: false, formula: `p${i}` })));
  }, [maxPieces, colName]);

  // 각 컬럼 i의 표시값 계산.
  const cellOf = (s: string, i: number): string => {
    const parts = splitToPieces(s, sep, mode);
    if (useFormula && cfg[i]?.formula.trim()) {
      return evalFormula(cfg[i].formula, { value: s, parts });
    }
    return parts[i] ?? "";
  };

  const apply = () => {
    const ts = Date.now();
    const columns = cfg
      .map((c, i) => ({ c, i }))
      .filter((x) => !x.c.excluded && x.c.name.trim() !== "")
      .map((x) => ({
        id: `sp_${ts}_${x.i}`,
        name: x.c.name.trim(),
        formula: useFormula && x.c.formula.trim() ? x.c.formula.trim() : `p${x.i}`,
      }));
    if (columns.length === 0) { onClose(); return; }
    onApply({ kind: "formulaColumns", sourceId: colId, separator: sep, mode, columns });
    onClose();
  };

  const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };
  const onBtn: React.CSSProperties = { ...btn, background: "#daeaff", borderColor: "#7aa7e0" };
  const sepBtn = (label: string, val: string) => (
    <button style={sep === val ? onBtn : btn} onClick={() => setSep(val)}>{label}</button>
  );
  const modeBtn = (label: string, val: SplitMode) => (
    <button style={mode === val ? onBtn : btn} onClick={() => setMode(val)}>{label}</button>
  );

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(1100px, 95vw)", height: "min(840px, 92vh)", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>컬럼 쪼개기 (미리보기)</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            <label style={{ fontSize: 13 }}>
              대상 컬럼{" "}
              <select value={colId} onChange={(e) => setColId(e.target.value)} style={{ fontSize: 13 }}>
                {store.columns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
            <span style={{ fontSize: 13, color: "#888" }}>방식</span>
            {modeBtn("구분자", "separator")}
            {modeBtn("정규식 분리", "regex")}
            {modeBtn("정규식 캡처", "capture")}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: "#888" }}>{mode === "capture" ? "캡처 패턴" : "구분자"}</span>
            {mode === "separator" && (<>{sepBtn("공백", " ")}{sepBtn("쉼표 ,", ",")}{sepBtn("하이픈 -", "-")}</>)}
            <input value={sep} onChange={(e) => setSep(e.target.value)}
              placeholder={mode === "capture" ? "예: ([A-Za-z]+) ([0-9.]+)" : mode === "regex" ? "정규식 (예: [-/]\\s*)" : "사용자 구분자"}
              style={{ width: mode === "separator" ? 130 : 280, fontSize: 13, padding: "2px 6px", fontFamily: mode === "separator" ? undefined : "monospace" }} />
            <label style={{ fontSize: 13, display: "flex", gap: 4, alignItems: "center", marginLeft: 8 }}>
              <input type="checkbox" checked={useFormula} onChange={(e) => setUseFormula(e.target.checked)} />
              수식 사용(조건식)
            </label>
          </div>

          {useFormula && (
            <div style={{ fontSize: 12, color: "#888", background: "#f7f9fc", border: "1px solid #e6ecf5", borderRadius: 6, padding: 8, fontFamily: "monospace", flexShrink: 0 }}>
              변수: value(원본), p0,p1…(조각) · 함수: if, contains, eq, gt, lt, and, or, not, extract, replace, concat, upper, lower, trim<br />
              예: <b>if(contains(value,"LTS"), "", p2)</b> · <b>extract(value,"([0-9.]+)",1)</b>
            </div>
          )}

          {/* 미리보기 (남는 공간을 채움) */}
          <div style={{ flex: 1, minHeight: 80, border: "1px solid #eee", borderRadius: 6, overflow: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <thead>
                <tr style={{ background: "#f5f5f7" }}>
                  <th style={th}>원본</th>
                  {cfg.map((c, i) => (
                    <th key={i} style={{ ...th, color: c.excluded ? "#bbb" : "#333", textDecoration: c.excluded ? "line-through" : "none" }}>
                      {c.name || `조각${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {samples.map((s, ri) => (
                  <tr key={ri}>
                    <td style={{ ...td, color: "#666" }}>{s}</td>
                    {cfg.map((c, i) => (
                      <td key={i} style={{ ...td, color: c.excluded ? "#ccc" : "#222" }}>{cellOf(s, i)}</td>
                    ))}
                  </tr>
                ))}
                {samples.length === 0 && (<tr><td style={td} colSpan={cfg.length + 1}>표시할 데이터가 없습니다</td></tr>)}
              </tbody>
            </table>
          </div>

          {/* 컬럼 설정 (높이 제한 + 스크롤, 푸터는 항상 아래 고정) */}
          <div style={{ flexShrink: 0, maxHeight: "40%", overflow: "auto", borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>각 조각을 어떤 컬럼으로 만들지 지정 (제외 시 컬럼 생성 안 함)</div>
          {cfg.map((c, i) => {
            const err = useFormula ? validateFormula(c.formula) : null;
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ width: 48, fontSize: 12, color: "#888", paddingTop: 6 }}>조각{i + 1}</span>
                <input value={c.name} disabled={c.excluded}
                  onChange={(e) => setCfg((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="새 컬럼명"
                  style={{ width: 160, fontSize: 13, padding: "3px 6px", background: c.excluded ? "#f3f3f3" : "#fff" }} />
                {useFormula && (
                  <>
                    <textarea value={c.formula} disabled={c.excluded} rows={2}
                      onChange={(e) => setCfg((arr) => arr.map((x, j) => (j === i ? { ...x, formula: e.target.value } : x)))}
                      placeholder={`수식 (기본 p${i}) — 여러 줄 가능`}
                      style={{ flex: 1, minWidth: 240, fontSize: 12, lineHeight: 1.5, padding: "4px 6px", fontFamily: "monospace", background: c.excluded ? "#f3f3f3" : "#fff", borderColor: err ? "#e0a8a0" : "#ccc", borderWidth: 1, borderStyle: "solid", borderRadius: 4, resize: "vertical" }} />
                    <button disabled={c.excluded} onClick={() => setEditing(i)} title="수식 편집기(여러 줄)" style={{ ...btn, padding: "3px 8px" }}>✎ 편집기</button>
                  </>
                )}
                <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
                  <input type="checkbox" checked={c.excluded} onChange={(e) => setCfg((arr) => arr.map((x, j) => (j === i ? { ...x, excluded: e.target.checked } : x)))} />
                  제외
                </label>
                {useFormula && err && <span style={{ color: "#c0392b", fontSize: 11 }}>{err}</span>}
              </div>
            );
          })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={apply}>적용</button>
        </div>
      </div>

      {editing !== null && (
        <FormulaEditor
          initial={cfg[editing]?.formula ?? ""}
          samples={samples.map((s) => ({ value: s, parts: splitToPieces(s, sep, mode) }))}
          onApply={(formula) => {
            setCfg((arr) => arr.map((x, j) => (j === editing ? { ...x, formula } : x)));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>,
    document.body,
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #e5e5e5", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" };
