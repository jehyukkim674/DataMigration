import { createPortal } from "react-dom";
import type { SnapshotFull } from "../io/session";

interface Props {
  snapshots: SnapshotFull[];
  onNew: () => void;
  onCompare: (snap: SnapshotFull) => void;
  onRestore: (snap: SnapshotFull) => void;
  onClose: () => void;
}

export function SnapshotDrawer({ snapshots, onNew, onCompare, onRestore, onClose }: Props) {
  const btn: React.CSSProperties = { padding: "4px 10px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 5, cursor: "pointer" };

  return createPortal(
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 92vw)", zIndex: 1100, display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid #e3e5e9", boxShadow: "-10px 0 36px rgba(20,25,35,0.18)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#4a6fa5", color: "#fff" }}>
        <strong>📸 스냅샷</strong>
        <button onClick={onClose} title="닫기" style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      <div style={{ padding: "8px 14px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
        <button style={{ ...btn, background: "#2f7ae0", color: "#fff", borderColor: "#2f7ae0" }} onClick={onNew}>➕ 새 스냅샷</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 10 }}>
        {snapshots.length === 0 && <div style={{ fontSize: 13, color: "#aaa", padding: 8 }}>저장된 스냅샷이 없습니다. "➕ 새 스냅샷"으로 현재 상태를 저장하세요.</div>}
        {snapshots.map((snap) => (
          <div key={snap.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "7px 8px", border: "1px solid #eee", borderRadius: 6, marginBottom: 4, background: "#fafafa" }}>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={snap.label}>{snap.label}</span>
            <button style={{ ...btn, padding: "2px 8px", fontSize: 12 }} onClick={() => onCompare(snap)}>비교</button>
            <button style={{ ...btn, padding: "2px 8px", fontSize: 12 }} onClick={() => onRestore(snap)}>복원</button>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
