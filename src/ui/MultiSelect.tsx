import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SelectOption } from "./Select";

interface Props {
  values: string[];
  options: SelectOption[];
  onChange: (values: string[]) => void;
  width?: number | string;
  placeholder?: string;
  "aria-label"?: string;
}

/** 체크박스 다중 선택 드롭다운(전체 선택/해제·검색). 목록은 body로 포털. */
export function MultiSelect({ values, options, onChange, width = 260, placeholder = "선택", ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);

  const set = useMemo(() => new Set(values), [values]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const labels = options.filter((o) => set.has(o.value)).map((o) => o.label);
  const summary = labels.length === 0 ? placeholder : labels.length <= 2 ? labels.join(", ") : `${labels.length}개 선택`;

  useEffect(() => {
    if (!open) return;
    const t = triggerRef.current;
    if (t) {
      const r = t.getBoundingClientRect();
      setRect({ left: r.left, top: r.bottom + 4, width: r.width });
    }
    setQuery("");
    const onDoc = (e: MouseEvent) => { if (!triggerRef.current?.contains(e.target as Node)) setOpen(false); };
    const id = setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", onDoc); };
  }, [open]);

  const toggle = (v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    onChange(options.filter((o) => next.has(o.value)).map((o) => o.value)); // 옵션 순서 유지
  };
  const selectAll = () => onChange(filtered.map((o) => o.value));
  const clearAll = () => onChange([]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={rest["aria-label"]}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8, width, boxSizing: "border-box", padding: "5px 10px", fontSize: 13, background: "var(--surface, #fff)", border: "1px solid var(--border-strong, #cdd1d8)", borderRadius: 6, cursor: "pointer", textAlign: "left", color: labels.length ? "inherit" : "#9aa0a6" }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
        <span style={{ color: "#6b7280", fontSize: 10 }}>▾</span>
      </button>

      {open && rect && createPortal(
        <div onMouseDown={(e) => e.stopPropagation()} style={{ position: "fixed", left: rect.left, top: rect.top, width: Math.max(rect.width, 200), zIndex: 2000, background: "#fff", border: "1px solid #cdd1d8", borderRadius: 8, boxShadow: "0 8px 28px rgba(20,25,35,0.16)", overflow: "hidden", maxHeight: 360, display: "flex", flexDirection: "column" }}>
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색…" style={{ margin: 6, padding: "6px 8px", fontSize: 13, border: "1px solid #e3e5e9", borderRadius: 6, outline: "none" }} />
          <div style={{ display: "flex", gap: 6, padding: "0 8px 6px", borderBottom: "1px solid #f0f0f0" }}>
            <button onClick={selectAll} style={miniBtn}>전체 선택</button>
            <button onClick={clearAll} style={miniBtn}>전체 해제</button>
          </div>
          <div role="listbox" style={{ overflow: "auto" }}>
            {filtered.length === 0 && <div style={{ padding: "8px 12px", color: "#9aa0a6", fontSize: 13 }}>결과 없음</div>}
            {filtered.map((o) => (
              <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", background: set.has(o.value) ? "#f3f6fc" : "transparent" }}>
                <input type="checkbox" checked={set.has(o.value)} onChange={() => toggle(o.value)} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
              </label>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

const miniBtn: React.CSSProperties = { padding: "2px 8px", fontSize: 12, background: "#f3f4f6", border: "1px solid #e3e5e9", borderRadius: 5, cursor: "pointer" };
