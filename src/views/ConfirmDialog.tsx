import { createPortal } from "react-dom";

interface Props {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title = "확인", message, confirmLabel = "확인", cancelLabel = "취소", danger, onConfirm, onCancel }: Props) {
  return createPortal(
    <div onMouseDown={onCancel} style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(400px, 92vw)", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: danger ? "#c0392b" : "#4a6fa5", color: "#fff", fontWeight: 600 }}>{title}</div>
        <div style={{ padding: 18, fontSize: 14, color: "#333", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 16px", borderTop: "1px solid #eee" }}>
          <button onClick={onCancel} style={{ padding: "7px 16px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer" }}>{cancelLabel}</button>
          <button autoFocus onClick={onConfirm} style={{ padding: "7px 18px", fontSize: 13, fontWeight: 600, background: danger ? "#e5484d" : "#2f7ae0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
