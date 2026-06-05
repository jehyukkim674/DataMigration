import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onChange: (order: string[], hidden: string[], aliases: Record<string, string>) => void; // 실시간 반영
  onClose: () => void;
}

const PREVIEW_CAP = 100_000; // 원본 모드 수집 상한(메모리 보호)
const ROW_H = 22; // 가상 스크롤 행 높이
const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };

// 지연 로딩(가상 스크롤): 보이는 행만 렌더 → 수만 행도 멈춤 없이 스크롤.
function VirtualRows({ items }: { items: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [vh, setVh] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setVh(el.clientHeight || 320);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setVh(el.clientHeight || 320));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const over = 8;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - over);
  const end = Math.min(items.length, Math.ceil((scrollTop + vh) / ROW_H) + over);
  const visible = items.slice(start, end);
  return (
    <div ref={ref} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      {items.length === 0 ? (
        <div style={{ padding: 12, color: "#aaa", fontSize: 12 }}>데이터 없음</div>
      ) : (
        <div style={{ height: items.length * ROW_H, position: "relative" }}>
          <div style={{ position: "absolute", top: start * ROW_H, left: 0, right: 0 }}>
            {visible.map((v, i) => (
              <div key={start + i} style={{ height: ROW_H, lineHeight: `${ROW_H}px`, padding: "0 12px", fontSize: 12, color: v === "" ? "#bbb" : "#333", borderBottom: "1px solid #f7f7f7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {v === "" ? "(빈 값)" : v}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
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
      values = values.sort((a, b) => {
        if (a === b) return 0;
        if (a === "") return 1;
        if (b === "") return -1;
        const r = numeric ? Number(a) - Number(b) : a.localeCompare(b);
        return sortDir === "asc" ? r : -r;
      });
    }
    return { values, filled, total: store.rowCount, unique: seen.size };
  }, [store, colId, uniqueOnly, sortDir]);

  return (
    <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{colName || "컬럼 선택"}</div>
        {colId && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            값 {preview.filled.toLocaleString()} / {preview.total.toLocaleString()} · 고유 {preview.unique.toLocaleString()}
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
      <VirtualRows items={preview.values} />
    </div>
  );
});

export function ColumnSettings({ allColumns, store, order, hidden, aliases, sources, sourceInfo, onChange, onClose }: Props) {
  const nameOf = useMemo(() => new Map(allColumns.map((c) => [c.id, c.name])), [allColumns]);
  const [list, setList] = useState<string[]>(() => order.filter((id) => nameOf.has(id)));
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => new Set(hidden));
  const [aliasMap, setAliasMap] = useState<Record<string, string>>(() => ({ ...aliases }));
  const [selected, setSelected] = useState<string>(() => list[0] ?? "");
  const dragIdx = useRef<number | null>(null);

  // ── 실시간 반영(디바운스 + 닫을 때 flush): 매 글자마다 34k행 재계산하지 않도록 ──
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const latestRef = useRef({ order: list, hidden: [...hiddenSet], aliases: aliasMap });
  latestRef.current = { order: list, hidden: [...hiddenSet], aliases: aliasMap };
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return; }
    const t = setTimeout(() => onChangeRef.current(latestRef.current.order, latestRef.current.hidden, latestRef.current.aliases), 150);
    return () => clearTimeout(t);
  }, [list, hiddenSet, aliasMap]);
  // 닫힐 때(언마운트) 마지막 상태를 즉시 반영(디바운스 대기분 유실 방지).
  useEffect(() => () => onChangeRef.current(latestRef.current.order, latestRef.current.hidden, latestRef.current.aliases), []);

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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#999" }}>변경 사항은 실시간으로 적용됩니다.</span>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={onClose}>닫기</button>
        </div>
    </div>,
    document.body,
  );
}
