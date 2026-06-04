import { useState } from "react";

interface Props {
  initial: string;
  error?: string;
  onApply: (query: string) => void;
}

export function QueryBar({ initial, error, onApply }: Props) {
  const [text, setText] = useState(initial);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", borderBottom: "1px solid #eee" }}>
      <span style={{ fontSize: 12, color: "#888" }}>WHERE</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onApply(text); }}
        placeholder='예: 나이 >= 30 AND 도시 = "서울"'
        style={{ flex: 1, padding: "4px 8px", fontFamily: "monospace" }}
      />
      <button onClick={() => onApply(text)}>적용</button>
      <button onClick={() => { setText(""); onApply(""); }}>초기화</button>
      {error && <span style={{ color: "#c0392b", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
