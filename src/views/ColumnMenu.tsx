import { useState } from "react";
import type { FilterCondition, FilterOp, SortDir } from "../view/viewState";

interface Props {
  colId: string;
  colName: string;
  pos: { x: number; y: number };
  currentSort?: SortDir;
  currentFilter?: FilterCondition;
  onSort: (dir: SortDir | null) => void;
  onHide: () => void;
  onFilter: (cond: FilterCondition | null) => void;
  onClose: () => void;
}

const OPS: { value: FilterOp; label: string; noValue?: boolean }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "포함(contains)" },
  { value: "startsWith", label: "시작(startsWith)" },
  { value: "endsWith", label: "끝(endsWith)" },
  { value: "like", label: "like(%,_)" },
  { value: "empty", label: "비어있음", noValue: true },
  { value: "notEmpty", label: "비어있지않음", noValue: true },
];

function parseVal(v: string): string | number {
  return /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v;
}

export function ColumnMenu(p: Props) {
  const [op, setOp] = useState<FilterOp>(p.currentFilter?.op ?? "contains");
  const [value, setValue] = useState<string>(
    p.currentFilter?.value !== undefined ? String(p.currentFilter.value) : "",
  );
  const noValue = OPS.find((o) => o.value === op)?.noValue;

  const applyFilter = () => {
    p.onFilter({ colId: p.colId, op, value: noValue ? undefined : parseVal(value) });
  };

  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        padding: "3px 8px",
        fontSize: 12,
        background: active ? "#daeaff" : "#fff",
        border: "1px solid #ccc",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div onMouseDown={p.onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div
        style={{
          position: "fixed",
          left: p.pos.x,
          top: p.pos.y,
          zIndex: 41,
          background: "#fff",
          border: "1px solid #bbb",
          borderRadius: 6,
          boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
          padding: 10,
          width: 240,
          fontSize: 13,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{p.colName}</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {btn("↑ 오름차순", p.currentSort === "asc", () => p.onSort("asc"))}
          {btn("↓ 내림차순", p.currentSort === "desc", () => p.onSort("desc"))}
          {p.currentSort && btn("해제", false, () => p.onSort(null))}
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>필터</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <select value={op} onChange={(e) => setOp(e.target.value as FilterOp)} style={{ fontSize: 12 }}>
              {OPS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {!noValue && (
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyFilter(); }}
                placeholder="값"
                autoFocus
                style={{ flex: 1, fontSize: 12, padding: "2px 6px" }}
              />
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {btn("필터 적용", false, applyFilter)}
            {p.currentFilter && btn("필터 제거", false, () => p.onFilter(null))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}>
          {btn("컬럼 숨기기", false, p.onHide)}
        </div>
      </div>
    </>
  );
}
