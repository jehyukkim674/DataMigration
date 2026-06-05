interface Props {
  onImport: () => void;
  onExport: () => void;
  onSave: () => void;
  onSnapshot: () => void;
  onJoin: () => void;
  snapshotActive: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onMerge: () => void;
  onSplit: () => void;
  onReplace: () => void;
  onNewColumn: () => void;
  onColumnSettings: () => void;
  columnSettingsActive: boolean;
  onCheckUpdate: () => void;
  headerLabel: "alias" | "name" | "both";
  onHeaderLabel: (v: "alias" | "name" | "both") => void;
  showMinimap: boolean;
  onToggleMinimap: (v: boolean) => void;
  showAiPanel: boolean;
  onToggleAiPanel: (v: boolean) => void;
}

export function Toolbar(p: Props) {
  const showAlias = p.headerLabel === "alias" || p.headerLabel === "both";
  const showName = p.headerLabel === "name" || p.headerLabel === "both";
  const setLabel = (alias: boolean, name: boolean) =>
    p.onHeaderLabel(alias && name ? "both" : alias ? "alias" : "name");
  const chk: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "#555", cursor: "pointer" };
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: 8,
        borderBottom: "1px solid #ddd",
        alignItems: "center",
      }}
    >
      <button onClick={p.onImport}>가져오기</button>
      <button onClick={p.onExport}>내보내기</button>
      <button onClick={p.onSave}>💾 저장</button>
      <button
        onClick={p.onSnapshot}
        style={p.snapshotActive ? { background: "var(--accent, #2f6fed)", color: "#fff", borderColor: "var(--accent, #2f6fed)" } : undefined}
      >
        📸 스냅샷
      </button>
      <button onClick={p.onJoin}>🔗 조인</button>
      <span style={{ width: 1, height: 20, background: "#ddd" }} />
      <button onClick={p.onUndo} disabled={!p.canUndo}>
        ↶ 되돌리기
      </button>
      <button onClick={p.onRedo} disabled={!p.canRedo}>
        ↷ 다시실행
      </button>
      <span style={{ width: 1, height: 20, background: "#ddd" }} />
      <button onClick={p.onMerge}>컬럼 합치기</button>
      <button onClick={p.onSplit}>컬럼 쪼개기</button>
      <button onClick={p.onReplace}>찾기/바꾸기</button>
      <button onClick={p.onNewColumn}>컬럼 생성</button>
      <button
        onClick={p.onColumnSettings}
        style={p.columnSettingsActive ? { background: "var(--accent, #2f6fed)", color: "#fff", borderColor: "var(--accent, #2f6fed)" } : undefined}
      >
        컬럼 설정
      </button>
      <span style={{ width: 1, height: 20, background: "#ddd" }} />
      <span style={{ fontSize: 12, color: "#999" }}>헤더:</span>
      <label style={chk}><input type="checkbox" checked={showAlias} onChange={(e) => setLabel(e.target.checked, showName)} /> 별칭</label>
      <label style={chk}><input type="checkbox" checked={showName} onChange={(e) => setLabel(showAlias, e.target.checked)} /> 원래이름</label>
      <span style={{ width: 1, height: 20, background: "#ddd" }} />
      <label style={chk}><input type="checkbox" checked={p.showMinimap} onChange={(e) => p.onToggleMinimap(e.target.checked)} /> 미니맵</label>
      <label style={chk}><input type="checkbox" checked={p.showAiPanel} onChange={(e) => p.onToggleAiPanel(e.target.checked)} /> AI</label>
      <span style={{ flex: 1 }} />
      <button onClick={p.onCheckUpdate}>업데이트 확인</button>
    </div>
  );
}
