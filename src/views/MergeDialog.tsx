import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";
import type { Operation } from "../ops/operations";
import { mergeValues } from "../ops/transforms";
import { genId } from "../core/id";
import { useEscClose } from "./useEscClose";

interface Props {
  store: ColumnStore;
  onApply: (op: Operation) => void;
  onClose: () => void;
}

const SAMPLE = 12;

/** 여러 컬럼을 구분자로 이어 붙여 새 컬럼을 만드는 다이얼로그(미리보기 포함). */
export function MergeDialog({ store, onApply, onClose }: Props) {
  // 선택 순서를 유지(합칠 때 이 순서대로 이어 붙임).
  const [selected, setSelected] = useState<string[]>([]);
  const [sep, setSep] = useState(" ");
  const [name, setName] = useState("");
  useEscClose(onClose);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const colName = (id: string) => store.columns.find((c) => c.id === id)?.name ?? id;
  const defaultName = useMemo(
    () => (selected.length ? selected.map(colName).join("_") : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected],
  );

  const samples = useMemo(() => {
    if (selected.length === 0) return [];
    const out: string[] = [];
    for (let r = 0; r < store.rowCount && out.length < SAMPLE; r++) {
      out.push(mergeValues(selected.map((id) => store.getCell(r, id)), sep));
    }
    return out;
  }, [store, selected, sep]);

  const canApply = selected.length >= 2;
  const apply = () => {
    if (!canApply) return;
    onApply({
      kind: "mergeColumns",
      sourceIds: selected,
      separator: sep,
      newColumnId: genId("c"),
      newColumnName: (name.trim() || defaultName || "합친컬럼"),
    });
    onClose();
  };

  const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };
  const onBtn: React.CSSProperties = { ...btn, background: "#daeaff", borderColor: "#7aa7e0" };
  const sepBtn = (label: string, val: string) => (
    <button style={sep === val ? onBtn : btn} onClick={() => setSep(val)}>{label}</button>
  );

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(720px, 94vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>컬럼 합치기</strong>
          <button onClick={onClose} aria-label="닫기" style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
          <div style={{ fontSize: 13, color: "#888" }}>합칠 컬럼을 클릭해 선택 (체크 순서대로 이어 붙입니다, 2개 이상)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {store.columns.map((c) => {
              const order = selected.indexOf(c.id);
              const on = order >= 0;
              return (
                <button key={c.id} onClick={() => toggle(c.id)} style={on ? onBtn : btn}>
                  {on && <span style={{ fontWeight: 700, marginRight: 4 }}>{order + 1}.</span>}
                  {c.name}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#888" }}>구분자</span>
            {sepBtn("공백", " ")}
            {sepBtn("쉼표 ,", ",")}
            {sepBtn("하이픈 -", "-")}
            {sepBtn("없음", "")}
            <input value={sep} onChange={(e) => setSep(e.target.value)} placeholder="사용자 구분자" style={{ width: 130, fontSize: 13, padding: "2px 6px" }} />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#888" }}>새 컬럼명</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName || "새 컬럼명"} style={{ flex: 1, fontSize: 13, padding: "3px 6px" }} />
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 6, overflow: "auto", maxHeight: 260 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <thead>
                <tr style={{ background: "#f5f5f7" }}>
                  <th style={th}>{name.trim() || defaultName || "결과 미리보기"}</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s, i) => (<tr key={i}><td style={td}>{s || "∅"}</td></tr>))}
                {samples.length === 0 && (<tr><td style={td}>컬럼을 선택하면 미리보기가 표시됩니다</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee" }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: canApply ? "#2f7ae0" : "#9bbce8", color: "#fff", borderColor: "#2f7ae0", cursor: canApply ? "pointer" : "not-allowed" }} disabled={!canApply} onClick={apply}>합치기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #e5e5e5", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis" };
