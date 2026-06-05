import { memo, useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";
import type { SourceInfo } from "../view/sourceInfo";

interface Props {
  allColumns: { id: string; name: string }[]; // 원본(자연) 순서
  store: ColumnStore;
  order: string[]; // 현재 표시 순서(전체 id)
  hidden: string[];
  aliases: Record<string, string>;
  sources?: Record<string, string>;
  sourceInfo?: SourceInfo;
  onApply: (order: string[], hidden: string[], aliases: Record<string, string>) => void;
  onClose: () => void;
}

const PREVIEW_CAP = 5000;
const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };
const arrow: React.CSSProperties = { ...btn, padding: "0 6px", fontSize: 12, lineHeight: "18px" };

// ── 컬럼 한 행(React.memo: 입력/선택 등 자기 prop이 바뀔 때만 리렌더) ──
interface RowProps {
  id: string;
  name: string;
  alias: string;
  hidden: boolean;
  selected: boolean;
  index: number;
  total: number;
  sourceLetter?: string;
  sourceColor?: string;
  sourceTitle?: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAlias: (id: string, v: string) => void;
  onMove: (from: number, to: number) => void;
  onDragStart: (i: number) => void;
  onDrop: (i: number) => void;
}

const ColumnRow = memo(function ColumnRow(p: RowProps) {
  return (
    <div
      draggable
      onDragStart={() => p.onDragStart(p.index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => p.onDrop(p.index)}
      onClick={() => p.onSelect(p.id)}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
        border: `1px solid ${p.selected ? "#7aa7e0" : "#eee"}`, borderRadius: 6, marginBottom: 4,
        background: p.selected ? "#eaf1fe" : "#fafafa", cursor: "pointer",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <button style={arrow} title="위로" disabled={p.index === 0} onClick={(e) => { e.stopPropagation(); p.onMove(p.index, p.index - 1); }}>▲</button>
        <button style={arrow} title="아래로" disabled={p.index === p.total - 1} onClick={(e) => { e.stopPropagation(); p.onMove(p.index, p.index + 1); }}>▼</button>
      </span>
      <input type="checkbox" checked={!p.hidden} onClick={(e) => e.stopPropagation()} onChange={() => p.onToggle(p.id)} aria-label={`${p.name} 표시`} />
      {p.sourceLetter && (
        <span title={`출처: ${p.sourceTitle ?? ""}`} style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 4, background: p.sourceColor, color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {p.sourceLetter}
        </span>
      )}
      <span style={{ width: 120, fontSize: 13, color: p.hidden ? "#aaa" : "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>{p.name}</span>
      <input
        value={p.alias}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => p.onAlias(p.id, e.target.value)}
        placeholder="별칭(설명)"
        style={{ flex: 1, minWidth: 100, fontSize: 13, padding: "3px 6px" }}
      />
      <span style={{ cursor: "grab", color: "#bbb", userSelect: "none" }} title="드래그로 이동">⠿</span>
    </div>
  );
});

// ── 선택 컬럼 데이터 미리보기(React.memo: 선택 컬럼이 바뀔 때만 스캔/리렌더) ──
const PreviewPane = memo(function PreviewPane({ store, colId, colName }: { store: ColumnStore; colId: string; colName: string }) {
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [sortDir, setSortDir] = useState<"none" | "asc" | "desc">("none");

  const preview = useMemo(() => {
    if (!colId) return { values: [] as string[], filled: 0, total: 0, unique: 0, shown: 0 };
    const seen = new Set<string>();
    let filled = 0;
    const raw: string[] = [];
    for (let r = 0; r < store.rowCount; r++) {
      const v = store.getCell(r, colId);
      const s = v === null ? "" : String(v);
      if (s !== "") { filled++; seen.add(s); }
      if (!uniqueOnly && raw.length < PREVIEW_CAP) raw.push(s);
    }
    let values = uniqueOnly ? [...seen] : raw;
    if (sortDir !== "none") {
      const numeric = values.every((x) => x === "" || !Number.isNaN(Number(x)));
      values = [...values].sort((a, b) => {
        if (a === b) return 0;
        if (a === "") return 1;
        if (b === "") return -1;
        const r = numeric ? Number(a) - Number(b) : a.localeCompare(b);
        return sortDir === "asc" ? r : -r;
      });
    }
    return { values, filled, total: store.rowCount, unique: seen.size, shown: values.length };
  }, [store, colId, uniqueOnly, sortDir]);

  return (
    <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{colName || "컬럼 선택"}</div>
        {colId && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            값 {preview.filled.toLocaleString()} / {preview.total.toLocaleString()} · 고유 {preview.unique.toLocaleString()}
            {uniqueOnly ? "" : ` · 표시 ${preview.shown.toLocaleString()}`}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={uniqueOnly} onChange={(e) => setUniqueOnly(e.target.checked)} /> 고유값만
          </label>
          <button style={{ ...btn, padding: "2px 8px", fontSize: 12 }} onClick={() => setSortDir((d) => (d === "none" ? "asc" : d === "asc" ? "desc" : "none"))} title="정렬">
            정렬 {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "⇅"}
          </button>
        </div>
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
  );
});

export function ColumnSettings({ allColumns, store, order, hidden, aliases, sources, sourceInfo, onApply, onClose }: Props) {
  const nameOf = useMemo(() => new Map(allColumns.map((c) => [c.id, c.name])), [allColumns]);
  const [list, setList] = useState<string[]>(() => order.filter((id) => nameOf.has(id)));
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => new Set(hidden));
  const [aliasMap, setAliasMap] = useState<Record<string, string>>(() => ({ ...aliases }));
  const [selected, setSelected] = useState<string>(() => list[0] ?? "");
  const dragIdx = useRef<number | null>(null);

  // 안정적인 콜백(React.memo가 행을 건너뛰도록).
  const onMove = useCallback((from: number, to: number) =>
    setList((o) => {
      if (to < 0 || to >= o.length) return o;
      const n = [...o];
      const [m] = n.splice(from, 1);
      n.splice(to, 0, m);
      return n;
    }), []);
  const onDragStart = useCallback((i: number) => { dragIdx.current = i; }, []);
  const onDrop = useCallback((to: number) => {
    const from = dragIdx.current;
    dragIdx.current = null;
    if (from === null || from === to) return;
    onMove(from, to);
  }, [onMove]);
  const onToggle = useCallback((id: string) =>
    setHiddenSet((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    }), []);
  const onAlias = useCallback((id: string, v: string) =>
    setAliasMap((m) => {
      const n = { ...m };
      if (v.trim() === "") delete n[id]; else n[id] = v;
      return n;
    }), []);
  const onSelect = useCallback((id: string) => setSelected(id), []);

  const reset = () => {
    setList(allColumns.map((c) => c.id));
    setHiddenSet(new Set());
    setAliasMap({});
  };

  return createPortal(
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(880px, 96vw)", zIndex: 1100, display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid #e3e5e9", boxShadow: "-10px 0 36px rgba(20,25,35,0.18)" }}>
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

        {sourceInfo?.hasSource && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "6px 14px", borderBottom: "1px solid #eee", flexShrink: 0, fontSize: 12, color: "#666" }}>
            <span style={{ color: "#999" }}>출처</span>
            {sourceInfo.legend.map((l) => (
              <span key={l.letter} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: l.color, color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{l.letter}</span>
                = {l.name}
              </span>
            ))}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <div style={{ flex: 1, minWidth: 0, overflow: "auto", padding: 10, borderRight: "1px solid #eee" }}>
            {list.map((id, i) => (
              <ColumnRow
                key={id}
                id={id}
                name={nameOf.get(id) ?? id}
                alias={aliasMap[id] ?? ""}
                hidden={hiddenSet.has(id)}
                selected={selected === id}
                index={i}
                total={list.length}
                sourceLetter={sourceInfo?.letterOf[id]}
                sourceColor={sourceInfo?.colorOf[id]}
                sourceTitle={sources?.[id]}
                onSelect={onSelect}
                onToggle={onToggle}
                onAlias={onAlias}
                onMove={onMove}
                onDragStart={onDragStart}
                onDrop={onDrop}
              />
            ))}
          </div>

          <PreviewPane store={store} colId={selected} colName={nameOf.get(selected) ?? ""} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <button style={btn} onClick={onClose}>닫기</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={() => onApply(list, [...hiddenSet], aliasMap)}>적용</button>
        </div>
    </div>,
    document.body,
  );
}
