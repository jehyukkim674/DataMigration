import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  allColumns: { id: string; name: string }[]; // 원본(자연) 순서
  order: string[]; // 현재 표시 순서(전체 id)
  hidden: string[];
  onApply: (order: string[], hidden: string[]) => void;
  onClose: () => void;
}

export function ColumnSettings({ allColumns, order, hidden, onApply, onClose }: Props) {
  const nameOf = useMemo(() => new Map(allColumns.map((c) => [c.id, c.name])), [allColumns]);
  const [list, setList] = useState<string[]>(() => order.filter((id) => nameOf.has(id)));
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => new Set(hidden));
  const dragIdx = useRef<number | null>(null);

  const onDrop = (to: number) => {
    const from = dragIdx.current;
    dragIdx.current = null;
    if (from === null || from === to) return;
    setList((o) => {
      const n = [...o];
      const [m] = n.splice(from, 1);
      n.splice(to, 0, m);
      return n;
    });
  };

  const toggle = (id: string) =>
    setHiddenSet((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const reset = () => {
    setList(allColumns.map((c) => c.id));
    setHiddenSet(new Set());
  };

  const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };

  return createPortal(
    <div
      onMouseDown={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: 420, maxHeight: "80vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <div>
            <strong>컬럼 설정</strong>
            <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 8 }}>드래그로 순서 변경, 체크로 표시/숨김</span>
          </div>
          <button onClick={onClose} title="닫기" style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderBottom: "1px solid #eee" }}>
          <button style={btn} onClick={() => setHiddenSet(new Set())}>전체 선택</button>
          <button style={btn} onClick={() => setHiddenSet(new Set(list))}>전체 해제</button>
          <button style={btn} onClick={reset}>초기화</button>
        </div>

        <div style={{ overflow: "auto", padding: 10 }}>
          {list.map((id, i) => (
            <div
              key={id}
              draggable
              onDragStart={() => (dragIdx.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: "1px solid #eee", borderRadius: 6, marginBottom: 4, background: "#fafafa" }}
            >
              <input type="checkbox" checked={!hiddenSet.has(id)} onChange={() => toggle(id)} />
              <span style={{ flex: 1, fontSize: 13, color: hiddenSet.has(id) ? "#aaa" : "#222" }}>{nameOf.get(id)}</span>
              <span style={{ cursor: "grab", color: "#bbb", userSelect: "none" }} title="드래그로 이동">⠿</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee" }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={() => onApply(list, [...hiddenSet])}>적용</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
