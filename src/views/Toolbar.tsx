interface Props {
  onImport: () => void;
  onExport: () => void;
  onSave: () => void;
  onJoin: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onMerge: () => void;
  onSplit: () => void;
  onNewColumn: () => void;
  onColumnSettings: () => void;
  onCheckUpdate: () => void;
}

export function Toolbar(p: Props) {
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
      <button onClick={p.onNewColumn}>컬럼 생성</button>
      <button onClick={p.onColumnSettings}>컬럼 설정</button>
      <span style={{ flex: 1 }} />
      <button onClick={p.onCheckUpdate}>업데이트 확인</button>
    </div>
  );
}
