import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";

interface Props {
  allColumns: { id: string; name: string }[]; // 원본(자연) 순서
  store: ColumnStore;
  order: string[]; // 현재 표시 순서(전체 id)
  hidden: string[];
  aliases: Record<string, string>;
  onApply: (order: string[], hidden: string[], aliases: Record<string, string>) => void;
  onClose: () => void;
}

const PREVIEW_ROWS = 80;

export function ColumnSettings({ allColumns, store, order, hidden, aliases, onApply, onClose }: Props) {
  const nameOf = useMemo(() => new Map(allColumns.map((c) => [c.id, c.name])), [allColumns]);
  const [list, setList] = useState<string[]>(() => order.filter((id) => nameOf.has(id)));
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => new Set(hidden));
  const [aliasMap, setAliasMap] = useState<Record<string, string>>(() => ({ ...aliases }));
  const [selected, setSelected] = useState<string>(() => list[0] ?? "");
  const dragIdx = useRef<number | null>(null);

  const move = (from: number, to: number) =>
    setList((o) => {
      if (to < 0 || to >= o.length) return o;
      const n = [...o];
      const [m] = n.splice(from, 1);
      n.splice(to, 0, m);
      return n;
    });

  const onDrop = (to: number) => {
    const from = dragIdx.current;
    dragIdx.current = null;
    if (from === null || from === to) return;
    move(from, to);
  };

  const toggle = (id: string) =>
    setHiddenSet((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const setAlias = (id: string, v: string) =>
    setAliasMap((m) => {
      const n = { ...m };
      if (v.trim() === "") delete n[id];
      else n[id] = v;
      return n;
    });

  const reset = () => {
    setList(allColumns.map((c) => c.id));
    setHiddenSet(new Set());
    setAliasMap({});
  };

  // 선택된 컬럼의 실제 데이터 샘플.
  const preview = useMemo(() => {
    if (!selected) return { values: [] as string[], filled: 0, total: 0, unique: 0 };
    const values: string[] = [];
    const seen = new Set<string>();
    let filled = 0;
    for (let r = 0; r < store.rowCount; r++) {
      const v = store.getCell(r, selected);
      const s = v === null ? "" : String(v);
      if (s !== "") { filled++; seen.add(s); }
      if (values.length < PREVIEW_ROWS) values.push(s);
    }
    return { values, filled, total: store.rowCount, unique: seen.size };
  }, [store, selected]);

  const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };
  const arrow: React.CSSProperties = { ...btn, padding: "0 6px", fontSize: 12, lineHeight: "18px" };

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(960px, 96vw)", height: "min(720px, 90vh)", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <div>
            <strong>컬럼 설정</strong>
            <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 8 }}>컬럼 클릭 → 오른쪽에서 실제 데이터 확인, ↑↓/드래그 순서, 별칭(설명) 입력</span>
          </div>
          <button onClick={onClose} title="닫기" style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
          <button style={btn} onClick={() => setHiddenSet(new Set())}>전체 선택</button>
          <button style={btn} onClick={() => setHiddenSet(new Set(list))}>전체 해제</button>
          <button style={btn} onClick={reset}>초기화</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          {/* 좌: 컬럼 목록 */}
          <div style={{ flex: 1, minWidth: 0, overflow: "auto", padding: 10, borderRight: "1px solid #eee" }}>
            {list.map((id, i) => (
              <div
                key={id}
                draggable
                onDragStart={() => (dragIdx.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                onClick={() => setSelected(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                  border: `1px solid ${selected === id ? "#7aa7e0" : "#eee"}`, borderRadius: 6, marginBottom: 4,
                  background: selected === id ? "#eaf1fe" : "#fafafa", cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <button style={arrow} title="위로" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(i, i - 1); }}>▲</button>
                  <button style={arrow} title="아래로" disabled={i === list.length - 1} onClick={(e) => { e.stopPropagation(); move(i, i + 1); }}>▼</button>
                </span>
                <input type="checkbox" checked={!hiddenSet.has(id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(id)} aria-label={`${nameOf.get(id)} 표시`} />
                <span style={{ width: 120, fontSize: 13, color: hiddenSet.has(id) ? "#aaa" : "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={nameOf.get(id)}>{nameOf.get(id)}</span>
                <input
                  value={aliasMap[id] ?? ""}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setAlias(id, e.target.value)}
                  placeholder="별칭(설명)"
                  style={{ flex: 1, minWidth: 100, fontSize: 13, padding: "3px 6px" }}
                />
                <span style={{ cursor: "grab", color: "#bbb", userSelect: "none" }} title="드래그로 이동">⠿</span>
              </div>
            ))}
          </div>

          {/* 우: 선택 컬럼 실제 데이터 */}
          <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{nameOf.get(selected) ?? "컬럼 선택"}</div>
              {selected && (
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  값 {preview.filled.toLocaleString()} / {preview.total.toLocaleString()} · 고유 {preview.unique.toLocaleString()}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "4px 0" }}>
              {preview.values.map((v, i) => (
                <div key={i} style={{ padding: "3px 12px", fontSize: 12, color: v === "" ? "#bbb" : "#333", borderBottom: "1px solid #f7f7f7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {v === "" ? "(빈 값)" : v}
                </div>
              ))}
              {preview.values.length === 0 && <div style={{ padding: 12, color: "#aaa", fontSize: 12 }}>데이터 없음</div>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={() => onApply(list, [...hiddenSet], aliasMap)}>적용</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
