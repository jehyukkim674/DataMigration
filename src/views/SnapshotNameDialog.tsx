import { useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  defaultName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function SnapshotNameDialog({ defaultName, onSave, onClose }: Props) {
  const [name, setName] = useState(defaultName);
  const save = () => onSave(name.trim() === "" ? defaultName : name.trim());

  const btn: React.CSSProperties = { padding: "6px 14px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer" };

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(420px, 92vw)", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
          <strong>📸 스냅샷 이름</strong>
        </div>
        <div style={{ padding: 16 }}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); else if (e.key === "Escape") onClose(); }}
            placeholder="스냅샷 이름"
            style={{ width: "100%", boxSizing: "border-box", fontSize: 14, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, outline: "none" }}
          />
          <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>비우면 기본 이름(시간)으로 저장됩니다.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #eee" }}>
          <button style={btn} onClick={onClose}>취소</button>
          <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={save}>저장</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
