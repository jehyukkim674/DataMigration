import { useState } from "react";
import { createPortal } from "react-dom";
import { ColumnStore } from "../data/ColumnStore";
import type { CellValue } from "../data/types";
import { importFileDialog } from "../io/importFile";
import { joinTables, type JoinType, type Table } from "../ops/join";
import { Select } from "../ui/Select";
import { useEscClose } from "./useEscClose";

interface Slot {
  store: ColumnStore;
  name: string;
}

interface Props {
  current?: Slot; // 현재 로드된 데이터(파일 A 기본값)
  onApply: (store: ColumnStore, label: string, columnSource: Record<string, string>) => void;
  onClose: () => void;
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function storeToTable(store: ColumnStore): Table {
  const rows: CellValue[][] = [];
  for (let r = 0; r < store.rowCount; r++) rows.push(store.columns.map((c) => store.getCell(r, c.id)));
  return { columns: store.columns.map((c) => ({ name: c.name, type: c.type })), rows };
}

export function JoinDialog({ current, onApply, onClose }: Props) {
  const [a, setA] = useState<Slot | null>(current ?? null);
  const [b, setB] = useState<Slot | null>(null);
  const [aKey, setAKey] = useState(0);
  const [bKey, setBKey] = useState(0);
  const [type, setType] = useState<JoinType>("full");
  const [loading, setLoading] = useState<"a" | "b" | null>(null);
  const [error, setError] = useState<string>("");
  useEscClose(onClose);

  const pick = async (which: "a" | "b") => {
    try {
      setLoading(which);
      setError("");
      const r = await importFileDialog();
      if (!r) return;
      const slot = { store: r.store, name: baseName(r.path) };
      if (which === "a") { setA(slot); setAKey(0); } else { setB(slot); setBKey(0); }
    } catch (e) {
      setError(`불러오기 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(null);
    }
  };

  const apply = () => {
    if (!a || !b) { setError("두 파일을 모두 선택하세요."); return; }
    const res = joinTables(storeToTable(a.store), aKey, storeToTable(b.store), bKey, type, { a: a.name, b: b.name });
    const cols = res.columns.map((c, i) => ({ id: `j${i}`, name: c.name, type: c.type }));
    const columnSource: Record<string, string> = {};
    cols.forEach((c, i) => { columnSource[c.id] = res.sources[i]; });
    onApply(ColumnStore.fromRows(cols, res.rows), `${a.name} ⋈ ${b.name}`, columnSource);
    onClose();
  };

  const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };

  const slotView = (label: string, slot: Slot | null, which: "a" | "b", keyIdx: number, setKey: (n: number) => void) => (
    <div style={{ flex: 1, minWidth: 0, border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>{label}</strong>
        <button style={btn} onClick={() => pick(which)} disabled={loading !== null}>
          {loading === which ? "불러오는 중…" : "파일 선택"}
        </button>
      </div>
      {slot ? (
        <>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            📄 {slot.name} · {slot.store.rowCount.toLocaleString()}행
          </div>
          <span style={{ fontSize: 12, color: "#888", display: "inline-flex", alignItems: "center", gap: 6 }}>
            키 컬럼
            <Select
              value={String(keyIdx)}
              options={slot.store.columns.map((c, i) => ({ value: String(i), label: c.name }))}
              onChange={(v) => setKey(Number(v))}
              searchable width={200} aria-label="키 컬럼"
            />
          </span>
        </>
      ) : (
        <div style={{ fontSize: 12, color: "#aaa" }}>파일을 선택하세요</div>
      )}
    </div>
  );

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(920px, 95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>파일 조인 (JOIN)</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 14, flex: 1, overflow: "auto" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            {slotView("파일 A", a, "a", aKey, setAKey)}
            {slotView("파일 B", b, "b", bKey, setBKey)}
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "#888" }}>조인 방식</span>
            <label><input type="radio" checked={type === "full"} onChange={() => setType("full")} /> 전체(매칭 없으면 각자 나열)</label>
            <label><input type="radio" checked={type === "left"} onChange={() => setType("left")} /> A 기준</label>
            <label><input type="radio" checked={type === "inner"} onChange={() => setType("inner")} /> 매칭만</label>
          </div>
          {error && <div style={{ color: "#c0392b", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={apply} disabled={!a || !b}>조인 실행</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
