import { useMemo, useRef, useState } from "react";
import { getSuggestions, type Suggestion } from "./queryAutocomplete";

interface Props {
  initial: string;
  error?: string;
  columns: string[]; // 자동완성용 컬럼명
  onApply: (query: string) => void;
}

/** macOS WKWebView가 자동 변환하는 스마트 따옴표를 일반 따옴표로 되돌린다. */
function normalizeQuotes(s: string): string {
  return s
    .replace(/[“”„‟«»]/g, '"')
    .replace(/[‘’‚‛]/g, "'");
}

/** 캐럿 위치에서 입력 중인 토큰(공백/연산자로 구분)의 시작 인덱스와 문자열을 구한다. */
function currentToken(text: string, caret: number): { start: number; token: string } {
  let start = caret;
  while (start > 0 && !/[\s=<>!()"]/.test(text[start - 1])) start--;
  return { start, token: text.slice(start, caret) };
}

export function QueryBar({ initial, error, columns, onApply }: Props) {
  const [text, setText] = useState(initial);
  const [caret, setCaret] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { start, token } = useMemo(() => currentToken(text, caret), [text, caret]);
  const suggestions = useMemo<Suggestion[]>(
    () => getSuggestions(text.slice(0, start), token, columns),
    [text, start, token, columns],
  );

  const showList = open && suggestions.length > 0;

  const accept = (s: Suggestion) => {
    const next = text.slice(0, start) + s.insert + text.slice(caret);
    setText(next);
    setOpen(false);
    const pos = start + s.insert.length;
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
        setCaret(pos);
      }
    });
  };

  const sync = () => {
    const el = inputRef.current;
    if (el) setCaret(el.selectionStart ?? el.value.length);
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", borderBottom: "1px solid #eee", position: "relative" }}>
      <span style={{ fontSize: 12, color: "#888" }}>WHERE</span>
      <div style={{ position: "relative", flex: 1 }}>
        <input
          ref={inputRef}
          value={text}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => {
            setText(normalizeQuotes(e.target.value));
            setOpen(true);
            setActive(0);
            requestAnimationFrame(sync);
          }}
          onKeyUp={sync}
          onClick={sync}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (showList) {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % suggestions.length); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + suggestions.length) % suggestions.length); return; }
              if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); const s = suggestions[active] ?? suggestions[0]; accept(s); return; }
              if (e.key === "Escape") { setOpen(false); return; }
            }
            if (e.key === "Enter") onApply(text);
          }}
          placeholder='예: 나이 >= 30 AND 도시 = "서울"'
          style={{ width: "100%", boxSizing: "border-box", padding: "4px 8px", fontFamily: "monospace" }}
        />
        {showList && (
          <ul
            style={{
              position: "absolute", top: "100%", left: 0, zIndex: 20, margin: 0, padding: 0,
              listStyle: "none", background: "#fff", border: "1px solid #ccc", borderRadius: 4,
              minWidth: 160, maxHeight: 220, overflow: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }}
          >
            {suggestions.map((s, i) => (
              <li
                key={s.text}
                onMouseDown={(e) => { e.preventDefault(); accept(s); }}
                onMouseEnter={() => setActive(i)}
                style={{ padding: "4px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: 13, background: i === active ? "#daeaff" : "transparent" }}
              >
                {s.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={() => onApply(text)}>적용</button>
      <button onClick={() => { setText(""); onApply(""); }}>초기화</button>
      {error && <span style={{ color: "#c0392b", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
