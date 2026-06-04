import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  width?: number | string;
  placeholder?: string;
  "aria-label"?: string;
}

/** 네이티브 select를 대체하는 모던 드롭다운(검색·키보드 지원). 목록은 body로 포털. */
export function Select({ value, options, onChange, searchable, width = 180, placeholder = "선택", ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);

  const current = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const t = triggerRef.current;
    if (t) {
      const r = t.getBoundingClientRect();
      setRect({ left: r.left, top: r.bottom + 4, width: r.width });
    }
    setQuery("");
    setActive(Math.max(0, filtered.findIndex((o) => o.value === value)));
    const onDoc = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // 다음 틱에 등록(트리거 클릭이 바로 닫지 않도록)
    const id = setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", onDoc); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (v: string) => { onChange(v); setOpen(false); };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={rest["aria-label"]}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          width, boxSizing: "border-box", padding: "5px 10px", fontSize: 13,
          background: "var(--surface, #fff)", border: "1px solid var(--border-strong, #cdd1d8)",
          borderRadius: 6, cursor: "pointer", textAlign: "left", color: current ? "inherit" : "#9aa0a6",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current?.label ?? placeholder}</span>
        <span style={{ color: "#6b7280", fontSize: 10 }}>▾</span>
      </button>

      {open && rect && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed", left: rect.left, top: rect.top, width: Math.max(rect.width, 160), zIndex: 2000,
            background: "#fff", border: "1px solid #cdd1d8", borderRadius: 8, boxShadow: "0 8px 28px rgba(20,25,35,0.16)",
            overflow: "hidden", maxHeight: 320, display: "flex", flexDirection: "column",
          }}
        >
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) choose(filtered[active].value); }
                else if (e.key === "Escape") setOpen(false);
              }}
              placeholder="검색…"
              style={{ margin: 6, padding: "6px 8px", fontSize: 13, border: "1px solid #e3e5e9", borderRadius: 6, outline: "none" }}
            />
          )}
          <div role="listbox" style={{ overflow: "auto" }}>
            {filtered.length === 0 && <div style={{ padding: "8px 12px", color: "#9aa0a6", fontSize: 13 }}>결과 없음</div>}
            {filtered.map((o, i) => (
              <div
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={(e) => { e.preventDefault(); choose(o.value); }}
                onMouseEnter={() => setActive(i)}
                style={{
                  padding: "7px 12px", fontSize: 13, cursor: "pointer",
                  background: i === active ? "var(--accent-soft, #eaf1fe)" : o.value === value ? "#f3f6fc" : "transparent",
                  fontWeight: o.value === value ? 600 : 400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
