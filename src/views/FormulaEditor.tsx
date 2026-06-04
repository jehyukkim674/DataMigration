import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { evalFormula, validateFormula } from "../ops/formula";
import { generateFormula } from "../ai/aiClient";

interface Sample {
  value: string;
  parts: string[];
}

interface Props {
  initial: string;
  samples: Sample[];
  onApply: (formula: string) => void;
  onClose: () => void;
}

const FUNCS: { label: string; insert: string; caret: number }[] = [
  { label: "if(c, a, b)", insert: 'if(, , )', caret: 3 },
  { label: "contains(a, b)", insert: 'contains(, )', caret: 9 },
  { label: "eq(a, b)", insert: 'eq(, )', caret: 3 },
  { label: "ne(a, b)", insert: 'ne(, )', caret: 3 },
  { label: "gt(a, b)", insert: 'gt(, )', caret: 3 },
  { label: "lt(a, b)", insert: 'lt(, )', caret: 3 },
  { label: "and(...)", insert: 'and()', caret: 4 },
  { label: "or(...)", insert: 'or()', caret: 3 },
  { label: "not(a)", insert: 'not()', caret: 4 },
  { label: "startsWith(a, b)", insert: 'startsWith(, )', caret: 11 },
  { label: "endsWith(a, b)", insert: 'endsWith(, )', caret: 9 },
  { label: "matches(a, 정규식)", insert: 'matches(, "")', caret: 8 },
  { label: "extract(a, 정규식, 그룹)", insert: 'extract(, "", 1)', caret: 8 },
  { label: "replace(a, 찾기, 바꾸기)", insert: 'replace(, "", "")', caret: 8 },
  { label: "concat(...)", insert: 'concat()', caret: 7 },
  { label: "upper(a)", insert: 'upper()', caret: 6 },
  { label: "lower(a)", insert: 'lower()', caret: 6 },
  { label: "trim(a)", insert: 'trim()', caret: 5 },
];

export function FormulaEditor({ initial, samples, onApply, onClose }: Props) {
  const [text, setText] = useState(initial);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [aiReq, setAiReq] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");

  const askAi = async () => {
    const req = aiReq.trim();
    if (!req || aiBusy) return;
    setAiBusy(true);
    setAiMsg("");
    try {
      const { formula, explain } = await generateFormula(req, samples);
      if (formula) {
        setText(formula);
        setAiMsg(explain || "AI가 수식을 생성했습니다.");
      } else {
        setAiMsg(explain || "수식을 생성하지 못했습니다.");
      }
    } catch (e) {
      setAiMsg(`오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiBusy(false);
    }
  };

  const error = useMemo(() => validateFormula(text), [text]);
  const maxParts = useMemo(() => samples.reduce((m, s) => Math.max(m, s.parts.length), 0), [samples]);
  const vars = useMemo(() => ["value", ...Array.from({ length: maxParts }, (_, i) => `p${i}`)], [maxParts]);

  const insertAtCaret = (snippet: string, caretOffset: number) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setText(next);
    const pos = start + caretOffset;
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); ta.setSelectionRange(pos, pos); }
    });
  };

  const chip: React.CSSProperties = { padding: "2px 8px", fontSize: 12, background: "#eef3fb", border: "1px solid #d4e0f0", borderRadius: 12, cursor: "pointer", fontFamily: "monospace" };

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(1000px, 94vw)", height: "min(760px, 92vh)", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>수식 편집기</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: 14, overflow: "auto" }}>
          {/* AI에게 수식 요청 */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13 }}>✨ AI</span>
            <input
              value={aiReq}
              onChange={(e) => setAiReq(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") askAi(); }}
              placeholder='원하는 걸 말로 설명 — 예: "천안이 들어가면 천안, 아니면 기타"'
              disabled={aiBusy}
              style={{ flex: 1, fontSize: 13, padding: "7px 10px", border: "1px solid #d5d5da", borderRadius: 18, outline: "none" }}
            />
            <button
              onClick={askAi}
              disabled={aiBusy}
              style={{ padding: "7px 14px", border: "none", borderRadius: 18, background: aiBusy ? "#9bbce8" : "#2f7ae0", color: "#fff", fontSize: 13, fontWeight: 600, cursor: aiBusy ? "default" : "pointer", whiteSpace: "nowrap" }}
            >
              {aiBusy ? "생성 중…" : "수식 생성"}
            </button>
          </div>
          {aiMsg && <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>{aiMsg}</div>}

          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='예: if(contains(value, "LTS"), "", p2)'
            spellCheck={false}
            style={{ width: "100%", boxSizing: "border-box", minHeight: 150, fontFamily: "monospace", fontSize: 14, lineHeight: 1.5, padding: 10, borderRadius: 6, border: `1px solid ${error ? "#e0a8a0" : "#cfcfd6"}`, outline: "none", resize: "vertical" }}
            autoFocus
          />
          <div style={{ fontSize: 12, marginTop: 6, color: error ? "#c0392b" : "#1f7a3d" }}>
            {text.trim() === "" ? "수식을 입력하세요" : error ? `✗ ${error}` : "✓ 유효한 수식"}
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            여러 줄 가능 — 각 줄 <span style={{ fontFamily: "monospace" }}>이름 = 식</span> 으로 변수 지정 후 다음 줄에서 사용, 마지막 식이 결과.
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>변수 (클릭하면 삽입)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {vars.map((v) => (
                <button key={v} style={chip} onClick={() => insertAtCaret(v, v.length)}>{v}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#888", margin: "10px 0 4px" }}>함수</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {FUNCS.map((f) => (
                <button key={f.label} style={chip} title={f.label} onClick={() => insertAtCaret(f.insert, f.caret)}>{f.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>미리보기 (샘플 적용 결과)</div>
            <div style={{ border: "1px solid #eee", borderRadius: 6, overflow: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f5f5f7" }}>
                    <th style={th}>원본</th>
                    <th style={th}>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.slice(0, 6).map((s, i) => (
                    <tr key={i}>
                      <td style={{ ...td, color: "#666" }}>{s.value}</td>
                      <td style={{ ...td, color: error ? "#c0392b" : "#1f7a3d" }}>{error ? "—" : (evalFormula(text, s) || "∅")}</td>
                    </tr>
                  ))}
                  {samples.length === 0 && (<tr><td style={td} colSpan={2}>샘플 없음</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer" }}>취소</button>
          <button onClick={() => onApply(text)} disabled={!!error}
            style={{ padding: "6px 16px", fontSize: 13, background: error ? "#9bbce8" : "#2f7ae0", color: "#fff", border: "none", borderRadius: 6, cursor: error ? "default" : "pointer", fontWeight: 600 }}>
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #e5e5e5", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" };
