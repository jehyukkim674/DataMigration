import { createPortal } from "react-dom";
import { useCallback, useRef, useState } from "react";

export type ToastKind = "info" | "error";
export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

/** 화면 하단에 잠시 떴다 사라지는 알림. alert() 대체. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, message, kind }]);
    const ttl = kind === "error" ? 4500 : 2400;
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);
  return { toasts, show };
}

export function ToastHost({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return createPortal(
    <div
      style={{
        position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
        zIndex: 2000, display: "flex", flexDirection: "column", gap: 8,
        alignItems: "center", pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            background: t.kind === "error" ? "rgba(192,57,43,0.95)" : "rgba(40,44,52,0.92)",
            color: "#fff", fontSize: 13, padding: "8px 16px", borderRadius: 16,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)", whiteSpace: "pre-wrap", maxWidth: "70vw",
          }}
        >
          {t.kind === "error" ? "⚠ " : "✅ "}{t.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}
