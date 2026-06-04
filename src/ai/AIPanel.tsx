import { useEffect, useState } from "react";
import type { ColumnStore } from "../data/ColumnStore";
import type { Operation } from "../ops/operations";
import type { ViewState } from "../view/viewState";
import { runAi } from "./aiClient";
import { applyMutations, mapCommands, type ViewMutation } from "./mapCommand";

interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

interface Pending {
  ops: Operation[];
  mutations: ViewMutation[];
  summary: string;
}

interface Props {
  store: ColumnStore;
  view: ViewState;
  onApplyOps: (ops: Operation[]) => void;
  onApplyView: (next: ViewState) => void;
}

function describeMapped(opCount: number, mutCount: number): string {
  const parts: string[] = [];
  if (opCount) parts.push(`데이터 변환 ${opCount}건`);
  if (mutCount) parts.push(`뷰 변경 ${mutCount}건`);
  return parts.join(", ");
}

export function AIPanel({ store, view, onApplyOps, onApplyView }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [dots, setDots] = useState(1);
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(t);
  }, [busy]);

  const send = async () => {
    const request = input.trim();
    if (!request || busy) return;
    if (store.rowCount === 0) {
      setMsgs((m) => [...m, { role: "ai", text: "먼저 데이터를 가져오세요." }]);
      return;
    }
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: request }]);
    setBusy(true);
    try {
      let idCounter = Date.now();
      const genId = () => `ai_${idCounter++}`;
      const { result, message } = await runAi(store, request);
      const mapped = mapCommands(result.commands, store.columns, genId);
      const summary = describeMapped(mapped.ops.length, mapped.mutations.length);
      const reply = result.reply || message || "";
      setMsgs((m) => [...m, { role: "ai", text: reply + (summary ? `\n(${summary})` : "") }]);
      if (mapped.ops.length || mapped.mutations.length) {
        setPending({ ops: mapped.ops, mutations: mapped.mutations, summary });
      }
      if (mapped.errors.length) {
        setMsgs((m) => [...m, { role: "ai", text: `⚠ ${mapped.errors.join(", ")}` }]);
      }
    } catch (e) {
      setMsgs((m) => [...m, { role: "ai", text: `오류: ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setBusy(false);
    }
  };

  const applyPending = () => {
    if (!pending) return;
    if (pending.ops.length) onApplyOps(pending.ops);
    if (pending.mutations.length) onApplyView(applyMutations(view, pending.mutations));
    setMsgs((m) => [...m, { role: "ai", text: "적용했습니다." }]);
    setPending(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h3 style={{ margin: "8px 12px", fontSize: 14 }}>AI 채팅</h3>
      <div style={{ flex: 1, overflow: "auto", padding: "0 12px", fontSize: 13 }}>
        {msgs.length === 0 && (
          <div style={{ color: "#aaa", fontSize: 12 }}>
            예: "나이 30 이상만 보여줘", "이름 컬럼 쪼개줘", "도시로 오름차순 정렬"
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ margin: "6px 0", textAlign: m.role === "user" ? "right" : "left" }}>
            <span style={{ display: "inline-block", padding: "6px 10px", borderRadius: 8, background: m.role === "user" ? "#daeaff" : "#f0f0f0", whiteSpace: "pre-wrap", textAlign: "left", maxWidth: "92%" }}>
              {m.text}
            </span>
          </div>
        ))}
        {busy && (
          <div style={{ margin: "6px 0", textAlign: "left" }}>
            <span style={{ display: "inline-block", padding: "6px 10px", borderRadius: 8, background: "#f0f0f0", color: "#666" }}>
              답변 중{".".repeat(dots)}
            </span>
          </div>
        )}
      </div>
      {pending && (
        <div style={{ padding: 8, borderTop: "1px solid #eee", background: "#fffbe6" }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>{pending.summary} 적용할까요?</div>
          <button onClick={applyPending}>적용</button>{" "}
          <button onClick={() => setPending(null)}>취소</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid #eee", alignItems: "center" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="자연어로 요청…"
          style={{
            flex: 1, padding: "8px 12px", boxSizing: "border-box", fontSize: 13,
            border: "1px solid #d5d5da", borderRadius: 18, outline: "none",
          }}
          disabled={busy}
        />
        <button
          onClick={send}
          disabled={busy}
          style={{
            padding: "8px 16px", border: "none", borderRadius: 18,
            background: busy ? "#9bbce8" : "#2f7ae0", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer",
            whiteSpace: "nowrap", transition: "background 0.15s",
          }}
        >
          {busy ? "보내는 중…" : "보내기"}
        </button>
      </div>
    </div>
  );
}
