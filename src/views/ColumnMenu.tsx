import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CellValue } from "../data/types";
import type { FilterCondition, FilterOp, SortDir } from "../view/viewState";

interface Props {
  colId: string;
  colName: string;
  pos: { x: number; y: number };
  uniqueValues: CellValue[];
  currentSort?: SortDir;
  currentFilter?: FilterCondition;
  onSort: (dir: SortDir | null) => void;
  onHide: () => void;
  onSplit: () => void;
  onFilter: (cond: FilterCondition | null) => void;
  onClose: () => void;
}

const OPS: { value: FilterOp; label: string; noValue?: boolean }[] = [
  { value: "eq", label: "= 같음" },
  { value: "neq", label: "≠ 다름" },
  { value: "gt", label: "> 초과" },
  { value: "gte", label: "≥ 이상" },
  { value: "lt", label: "< 미만" },
  { value: "lte", label: "≤ 이하" },
  { value: "contains", label: "포함" },
  { value: "startsWith", label: "~로 시작" },
  { value: "endsWith", label: "~로 끝남" },
  { value: "like", label: "like (%,_)" },
  { value: "empty", label: "비어있음", noValue: true },
  { value: "notEmpty", label: "비어있지 않음", noValue: true },
];

const MAX_LIST = 300;

function parseVal(v: string): string | number {
  return /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v;
}

export function ColumnMenu(p: Props) {
  const [op, setOp] = useState<FilterOp>(p.currentFilter?.op ?? "contains");
  const [value, setValue] = useState<string>(
    p.currentFilter?.value !== undefined ? String(p.currentFilter.value) : "",
  );
  const noValue = OPS.find((o) => o.value === op)?.noValue;

  // 값 선택(엑셀식) 상태
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((p.currentFilter?.op === "in" ? p.currentFilter.values ?? [] : []).map(String)),
  );

  const filteredValues = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = q
      ? p.uniqueValues.filter((v) => String(v).toLowerCase().includes(q))
      : p.uniqueValues;
    return arr.slice(0, MAX_LIST);
  }, [p.uniqueValues, search]);

  const toggleVal = (key: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const applyOpFilter = () =>
    p.onFilter({ colId: p.colId, op, value: noValue ? undefined : parseVal(value) });

  const applyInFilter = () => {
    if (selected.size === 0) { p.onFilter(null); return; }
    const values = p.uniqueValues.filter(
      (v): v is string | number => v !== null && selected.has(String(v)),
    );
    p.onFilter({ colId: p.colId, op: "in", values });
  };

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", fontSize: 12, padding: "4px 6px" };
  const btn: React.CSSProperties = { padding: "4px 8px", fontSize: 12, background: "#fff", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer" };
  const activeBtn: React.CSSProperties = { ...btn, background: "#daeaff", borderColor: "#7aa7e0" };

  const [pos, setPos] = useState(() => ({
    left: Math.min(p.pos.x, window.innerWidth - 250),
    top: Math.min(p.pos.y, window.innerHeight - 420),
  }));
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const startDrag = (e: React.MouseEvent) => {
    dragRef.current = { dx: e.clientX - pos.left, dy: e.clientY - pos.top };
    const move = (ev: MouseEvent) => {
      if (dragRef.current) setPos({ left: ev.clientX - dragRef.current.dx, top: ev.clientY - dragRef.current.dy });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return createPortal(
    <>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed", left: pos.left, top: pos.top, zIndex: 41, width: 240, boxSizing: "border-box",
          background: "#fff", border: "1px solid #bbb", borderRadius: 6,
          boxShadow: "0 6px 20px rgba(0,0,0,0.18)", padding: 10, fontSize: 13,
        }}
      >
        <div
          onMouseDown={startDrag}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            margin: "-10px -10px 8px -10px", padding: "6px 10px",
            background: "#4a6fa5", color: "#fff",
            borderTopLeftRadius: 6, borderTopRightRadius: 6,
            cursor: "move", userSelect: "none",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.colName}
          </span>
          <button
            onClick={p.onClose}
            title="닫기"
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 15, lineHeight: 1, color: "#fff", padding: "0 2px" }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button style={p.currentSort === "asc" ? activeBtn : btn} onClick={() => p.onSort("asc")}>↑ 오름</button>
          <button style={p.currentSort === "desc" ? activeBtn : btn} onClick={() => p.onSort("desc")}>↓ 내림</button>
          {p.currentSort && <button style={btn} onClick={() => p.onSort(null)}>해제</button>}
        </div>

        {/* 값 선택(엑셀식) */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#888" }}>값 선택 ({p.uniqueValues.length})</span>
            <span>
              <button style={{ ...btn, padding: "1px 5px" }} onClick={() => setSelected(new Set(filteredValues.map(String)))}>전체</button>{" "}
              <button style={{ ...btn, padding: "1px 5px" }} onClick={() => setSelected(new Set())}>해제</button>
            </span>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="값 검색" style={{ ...inputStyle, marginBottom: 4 }} />
          <div style={{ maxHeight: 150, overflow: "auto", border: "1px solid #eee", borderRadius: 4, padding: 4 }}>
            {filteredValues.length === 0 && <div style={{ color: "#aaa", fontSize: 12, padding: 4 }}>값 없음</div>}
            {filteredValues.map((v) => {
              const key = String(v);
              return (
                <label key={key} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, padding: "1px 2px", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.has(key)} onChange={() => toggleVal(key)} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{key}</span>
                </label>
              );
            })}
            {p.uniqueValues.length > filteredValues.length && (
              <div style={{ color: "#aaa", fontSize: 11, padding: 2 }}>…검색으로 좁히세요</div>
            )}
          </div>
          <div style={{ marginTop: 6 }}>
            <button style={activeBtn} onClick={applyInFilter}>선택값으로 필터 ({selected.size})</button>
          </div>
        </div>

        {/* 조건 필터 */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>조건 필터</div>
          <select value={op} onChange={(e) => setOp(e.target.value as FilterOp)} style={{ ...inputStyle, marginBottom: 6 }}>
            {OPS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
          {!noValue && (
            <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyOpFilter(); }} placeholder="값" style={{ ...inputStyle, marginBottom: 6 }} />
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button style={btn} onClick={applyOpFilter}>조건 적용</button>
            {p.currentFilter && <button style={btn} onClick={() => p.onFilter(null)}>필터 제거</button>}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8, display: "flex", gap: 6 }}>
          <button style={btn} onClick={p.onSplit}>✂ 쪼개기</button>
          <button style={btn} onClick={p.onHide}>컬럼 숨기기</button>
        </div>
      </div>
    </>,
    document.body,
  );
}
