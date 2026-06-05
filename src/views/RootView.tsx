import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ColumnStore } from "../data/ColumnStore";
import { History } from "../ops/history";
import type { Operation } from "../ops/operations";
import { DataGrid } from "../grid/DataGrid";
import { Toolbar } from "./Toolbar";
import { importFileDialog } from "../io/importFile";
import { exportFileDialog } from "../io/exportFile";
import { saveSession, loadSession, captureSnapshot, loadSnapshots, addSnapshot, removeSnapshot, restoreSnapshot, type SnapshotFull } from "../io/session";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { checkUpdateStatus } from "../core/updater";
import { EMPTY_VIEW, toggleHidden, setSort, setColumnFilter, setColumnOrder, moveVisibleColumn, effectiveColumnOrder, type ViewState, type FilterCondition, type SortDir } from "../view/viewState";
import { computeView } from "../view/computeView";
import { QueryBar } from "./QueryBar";
import { ColumnVisibility } from "./ColumnVisibility";
import { ColumnMenu } from "./ColumnMenu";
import { ColumnSettings } from "./ColumnSettings";
import { SplitDialog } from "./SplitDialog";
import { ReplaceDialog } from "./ReplaceDialog";
import { JoinDialog } from "./JoinDialog";
import { AIPanel } from "../ai/AIPanel";
import { LoadingOverlay } from "./LoadingOverlay";
import { StatusBar } from "./StatusBar";
import { CompareDialog } from "./CompareDialog";
import { SnapshotNameDialog } from "./SnapshotNameDialog";
import { SnapshotDrawer } from "./SnapshotDrawer";
import { useAppZoom } from "./useAppZoom";
import { logError } from "../core/log";

const EMPTY = ColumnStore.fromRows([], []);

/** YYYY-MM-DD HH:MM:SS 형식 타임스탬프. */
function fullStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function RootView() {
  const historyRef = useRef(new History(EMPTY));
  const [, forceRender] = useState(0);
  const [view, setView] = useState<ViewState>(EMPTY_VIEW);
  const [menu, setMenu] = useState<{ colId: string; x: number; y: number } | null>(null);
  const [showColSettings, setShowColSettings] = useState(false);
  const [activeCell, setActiveCell] = useState<{ col: number; row: number } | null>(null);
  const [snapPrompt, setSnapPrompt] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [split, setSplit] = useState<{ colId?: string } | null>(null);
  const [replaceCol, setReplaceCol] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [compare, setCompare] = useState<SnapshotFull | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [source, setSource] = useState<string | undefined>(undefined);
  const snapshotsRef = useRef<SnapshotFull[]>([]);
  const stateRef = useRef<{ store: ColumnStore; view: ViewState; source?: string }>({ store: EMPTY, view: EMPTY_VIEW, source: undefined });
  const rerender = useCallback(() => forceRender((n) => n + 1), []);
  const menuColId = menu?.colId;
  const menuUniques = useMemo(
    () => (menuColId ? historyRef.current.store.uniqueValues(menuColId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menuColId],
  );

  const apply = useCallback(
    (op: Operation) => {
      historyRef.current.apply(op);
      rerender();
    },
    [rerender],
  );

  const store = historyRef.current.store;
  // 대용량 행 필터/정렬은 store·view가 바뀔 때만 재계산(셀 선택·줌 등에는 재계산 안 함).
  const computed = useMemo(() => computeView(store, view), [store, view]);
  const { zoom, setZoom } = useAppZoom();
  stateRef.current = { store, view, source };

  // 현재 상태 저장(자동저장/종료저장 공용).
  const saveNow = useCallback(async () => {
    const s = stateRef.current;
    if (s.store.rowCount === 0) return;
    try { await saveSession(s.store, s.view, s.source); } catch (e) { logError("saveSession(자동)", e); }
  }, []);

  // 변경 시 3초 디바운스 자동 저장.
  useEffect(() => {
    if (store.rowCount === 0) return;
    const t = setTimeout(saveNow, 3000);
    return () => clearTimeout(t);
  }, [store, view, source, saveNow]);

  // 30초 주기 저장 + 종료 시 저장.
  useEffect(() => {
    const iv = setInterval(saveNow, 30000);
    const w = getCurrentWindow();
    let un: (() => void) | undefined;
    w.onCloseRequested(async (e) => {
      e.preventDefault();
      await saveNow();
      w.destroy();
    }).then((u) => { un = u; }).catch((e) => logError("onCloseRequested(비-Tauri 가능)", e));
    return () => { clearInterval(iv); un?.(); };
  }, [saveNow]);

  // 최종 이름(name)을 그대로 라벨로 사용해 스냅샷 저장.
  const takeSnapshot = useCallback(async (name: string) => {
    const s = stateRef.current;
    if (s.store.rowCount === 0) return;
    try {
      snapshotsRef.current = await addSnapshot(snapshotsRef.current, captureSnapshot(s.store, s.view, s.source, name));
      rerender();
    } catch (e) {
      logError("takeSnapshot", e);
    }
  }, []);

  const autoLabel = (prefix: string) =>
    `${prefix} ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

  const onDeleteSnapshot = useCallback(async (snap: SnapshotFull) => {
    if (!confirm(`스냅샷 "${snap.label}"을(를) 삭제할까요?`)) return;
    try {
      snapshotsRef.current = await removeSnapshot(snapshotsRef.current, snap.id);
      rerender();
    } catch (e) {
      logError("removeSnapshot", e);
    }
  }, [rerender]);

  const onRestoreSnapshot = useCallback((snap: SnapshotFull) => {
    try {
      const r = restoreSnapshot(snap);
      historyRef.current = new History(r.store);
      setSource(r.source);
      setView(r.view);
      rerender();
    } catch (e) {
      logError("restoreSnapshot", e);
      alert("스냅샷 복원에 실패했습니다.");
    }
  }, [rerender]);

  // 저장된 스냅샷 목록 로드(자동 스냅샷 생성은 하지 않음 — 사용자가 직접 생성).
  useEffect(() => {
    loadSnapshots().then((l) => { snapshotsRef.current = l; rerender(); }).catch((e) => logError("loadSnapshots", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onImport = useCallback(async () => {
    try {
      setBusy("파일 불러오는 중…");
      const r = await importFileDialog();
      if (r) {
        historyRef.current = new History(r.store);
        setSource(r.path);
        setView(EMPTY_VIEW); // 새 데이터엔 이전 필터/정렬 적용 안 함
        rerender();
        // 최초 읽을 때 한 번만 자동 스냅샷("최초 생성 YYYY-MM-DD HH:MM:SS").
        try {
          const snap = captureSnapshot(r.store, EMPTY_VIEW, r.path, `최초 생성 ${fullStamp()}`);
          snapshotsRef.current = await addSnapshot(snapshotsRef.current, snap);
        } catch (e) {
          logError("최초 스냅샷", e);
        }
      }
    } catch (e) {
      logError("importFile", e);
      alert(`가져오기 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }, [rerender]);

  const onSave = useCallback(async () => {
    if (store.rowCount === 0) { alert("저장할 데이터가 없습니다."); return; }
    try {
      setBusy("저장 중…");
      await saveSession(store, view, source);
      alert("현재 화면을 저장했습니다. 다음 실행 시 복원됩니다.");
    } catch (e) {
      logError("saveSession", e);
      alert(`저장 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }, [store, view, source]);

  // 시작 시 저장된 마지막 화면 복원(대용량이면 로딩 표시).
  useEffect(() => {
    setBusy("마지막 화면 불러오는 중…");
    loadSession()
      .then((r) => {
        if (r) {
          historyRef.current = new History(r.store);
          setView(r.view);
          setSource(r.source);
          rerender();
        }
      })
      .catch((e) => logError("loadSession", e))
      .finally(() => setBusy(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onExport = useCallback(async () => {
    try {
      setBusy("내보내는 중…");
      await exportFileDialog(store, {
        columnIds: computed.visibleColumns.map((c) => c.id),
        rowOrder: computed.rowOrder,
      });
    } catch (e) {
      logError("exportFile", e);
      alert(`내보내기 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }, [store, computed]);

  const onHeaderMenu = useCallback((colId: string, pos: { x: number; y: number }) => {
    setMenu({ colId, x: pos.x, y: pos.y });
  }, []);

  const onReorder = useCallback((from: number, to: number) => {
    setView((v) => moveVisibleColumn(v, store.columns.map((c) => c.id), from, to));
  }, [store]);

  // 헤더 제목 클릭 → 오름→내림→해제 순환(단일 정렬).
  const onHeaderClick = useCallback((colId: string) => {
    setView((v) => {
      const cur = v.sorts.find((s) => s.colId === colId)?.dir;
      const next = cur === "asc" ? "desc" : cur === "desc" ? null : "asc";
      return setSort(v, colId, next);
    });
  }, []);

  const onEditCell = useCallback(
    (row: number, colId: string, value: string) =>
      apply({ kind: "editCell", colId, row, value }),
    [apply],
  );

  const onNewColumn = useCallback(() => {
    const name = prompt("새 컬럼 이름");
    if (!name) return;
    apply({
      kind: "newColumn",
      id: `c_${Date.now()}`,
      name,
      type: "string",
      fillValue: "",
    });
  }, [apply]);

  const onMerge = useCallback(() => {
    const ids = prompt("합칠 컬럼 id들(쉼표로 구분, 예: col0,col1)");
    if (!ids) return;
    apply({
      kind: "mergeColumns",
      sourceIds: ids.split(",").map((s) => s.trim()),
      separator: " ",
      newColumnId: `c_${Date.now()}`,
      newColumnName: "merged",
    });
  }, [apply]);

  const onSplit = useCallback(() => setSplit({}), []);

  const onCheckUpdate = useCallback(async () => {
    const result = await checkUpdateStatus();
    if (result.kind === "latest") {
      alert("최신 버전입니다.");
    } else if (result.kind === "error") {
      alert(`업데이트 확인 실패: ${result.message}`);
    } else {
      const ok = confirm(
        `새 버전 v${result.update.version} 이(가) 있습니다. 지금 설치하고 재시작할까요?`,
      );
      if (ok) await result.update.install();
    }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar
        onImport={onImport}
        onExport={onExport}
        onSave={onSave}
        onSnapshot={() => setShowSnapshots((s) => !s)}
        snapshotActive={showSnapshots}
        onJoin={() => setShowJoin(true)}
        onUndo={() => {
          historyRef.current.undo();
          rerender();
        }}
        onRedo={() => {
          historyRef.current.redo();
          rerender();
        }}
        canUndo={historyRef.current.canUndo}
        canRedo={historyRef.current.canRedo}
        onMerge={onMerge}
        onSplit={onSplit}
        onReplace={() => setReplaceCol(computed.visibleColumns[0]?.id ?? store.columns[0]?.id ?? null)}
        onNewColumn={onNewColumn}
        onColumnSettings={() => setShowColSettings((s) => !s)}
        columnSettingsActive={showColSettings}
        onCheckUpdate={onCheckUpdate}
        headerLabel={view.headerLabel ?? "alias"}
        onHeaderLabel={(v) => setView((vv) => ({ ...vv, headerLabel: v }))}
        showMinimap={view.showMinimap !== false}
        onToggleMinimap={(b) => setView((vv) => ({ ...vv, showMinimap: b }))}
        showAiPanel={view.showAiPanel !== false}
        onToggleAiPanel={(b) => setView((vv) => ({ ...vv, showAiPanel: b }))}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={75} minSize={40}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {store.rowCount === 0 ? (
                <div style={{ padding: 24, color: "#888" }}>
                  파일을 가져오세요 (가져오기 버튼)
                </div>
              ) : (
                <>
                  <QueryBar initial={view.query} error={computed.queryError} columns={[...store.columns.map((c) => c.name), ...Object.values(view.columnAliases ?? {})]} onApply={(q) => setView((v) => ({ ...v, query: q }))} />
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <DataGrid
                      store={store}
                      visibleColumns={computed.visibleColumns}
                      rowOrder={computed.rowOrder}
                      sorts={view.sorts}
                      filteredCols={view.filters.map((f) => f.colId)}
                      onEditCell={onEditCell}
                      onHeaderMenu={onHeaderMenu}
                      onHeaderClick={onHeaderClick}
                      onReorder={onReorder}
                      onDeleteRows={(rows) => apply({ kind: "deleteRows", rows })}
                      onDeleteColumns={(ids) => apply({ kind: "batch", ops: ids.map((colId) => ({ kind: "deleteColumn", colId })) })}
                      headerLabel={view.headerLabel ?? "alias"}
                      showMinimap={view.showMinimap !== false}
                      onActiveCell={setActiveCell}
                    />
                  </div>
                </>
              )}
            </div>
          </Panel>
          {view.showAiPanel !== false && (<>
          <PanelResizeHandle style={{ width: 4, background: "#eee" }} />
          <Panel defaultSize={28} minSize={18}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: 12, borderBottom: "1px solid #eee", maxHeight: "45%", overflow: "auto" }}>
                <ColumnVisibility store={store} hidden={view.hiddenColumns} onToggle={(id) => setView((v) => toggleHidden(v, id))} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}>
                  <button onClick={() => setView((v) => ({ ...EMPTY_VIEW, columnAliases: v.columnAliases, columnSource: v.columnSource }))}>뷰 초기화</button>
                  <span style={{ fontSize: 12, color: "#888" }}>{computed.rowOrder.length} / {store.rowCount} 행</span>
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "#555" }}>
                    히스토리 ({historyRef.current.entries.length})
                  </summary>
                  <ol style={{ fontSize: 13, paddingLeft: 18, margin: "6px 0 0" }}>
                    {historyRef.current.entries.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ol>
                </details>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <AIPanel
                  store={store}
                  view={view}
                  onApplyOps={(ops) => ops.forEach((op) => apply(op))}
                  onApplyView={(next) => setView(next)}
                />
              </div>
            </div>
          </Panel>
          </>)}
        </PanelGroup>
      </div>
      <StatusBar
        source={source}
        visibleRows={computed.rowOrder.length}
        totalRows={store.rowCount}
        colCount={computed.visibleColumns.length}
        zoom={zoom}
        onZoom={setZoom}
        cellInfo={
          activeCell && computed.visibleColumns[activeCell.col]
            ? `${computed.visibleColumns[activeCell.col].alias || computed.visibleColumns[activeCell.col].name} · ${(activeCell.row + 1).toLocaleString()}행`
            : undefined
        }
      />
      {menu && (
        <ColumnMenu
          colId={menu.colId}
          colName={store.columns.find((c) => c.id === menu.colId)?.name ?? menu.colId}
          pos={{ x: menu.x, y: menu.y }}
          uniqueValues={menuUniques}
          currentSort={view.sorts.find((s) => s.colId === menu.colId)?.dir}
          currentFilter={view.filters.find((f) => f.colId === menu.colId)}
          onSort={(dir: SortDir | null) => { setView((v) => setSort(v, menu.colId, dir)); setMenu(null); }}
          onHide={() => { setView((v) => toggleHidden(v, menu.colId)); setMenu(null); }}
          onSplit={() => { setSplit({ colId: menu.colId }); setMenu(null); }}
          onReplace={() => { setReplaceCol(menu.colId); setMenu(null); }}
          onDelete={() => {
            const nm = store.columns.find((c) => c.id === menu.colId)?.name ?? menu.colId;
            if (confirm(`'${nm}' 컬럼을 삭제할까요?`)) apply({ kind: "deleteColumn", colId: menu.colId });
            setMenu(null);
          }}
          onFilter={(cond: FilterCondition | null) => { setView((v) => setColumnFilter(v, menu.colId, cond)); setMenu(null); }}
          onClose={() => setMenu(null)}
        />
      )}
      {showColSettings && (
        <ColumnSettings
          allColumns={store.columns.map((c) => ({ id: c.id, name: c.name }))}
          store={store}
          order={effectiveColumnOrder(store.columns.map((c) => c.id), view.columnOrder)}
          hidden={view.hiddenColumns}
          aliases={view.columnAliases ?? {}}
          sources={view.columnSource}
          onApply={(order, hidden, aliases) => {
            setView((v) => ({ ...setColumnOrder(v, order), hiddenColumns: hidden, columnAliases: aliases }));
            setShowColSettings(false);
          }}
          onClose={() => setShowColSettings(false)}
        />
      )}
      {split && store.rowCount > 0 && (
        <SplitDialog
          store={store}
          initialColId={split.colId}
          onApply={(op) => apply(op)}
          onClose={() => setSplit(null)}
        />
      )}
      {replaceCol && store.columns.some((c) => c.id === replaceCol) && (
        <ReplaceDialog
          store={store}
          colId={replaceCol}
          onApply={(op) => apply(op)}
          onClose={() => setReplaceCol(null)}
        />
      )}
      {showJoin && (
        <JoinDialog
          current={store.rowCount > 0 ? { store, name: (source?.split(/[\\/]/).pop()) ?? "현재 데이터" } : undefined}
          onApply={(joined, label, columnSource) => {
            historyRef.current = new History(joined);
            setSource(label);
            setView({ ...EMPTY_VIEW, columnSource });
            rerender();
          }}
          onClose={() => setShowJoin(false)}
        />
      )}
      {compare && (
        <CompareDialog
          current={store}
          snapshot={restoreSnapshot(compare).store}
          label={compare.label}
          onClose={() => setCompare(null)}
        />
      )}
      {showSnapshots && (
        <SnapshotDrawer
          snapshots={snapshotsRef.current}
          onNew={() => setSnapPrompt(true)}
          onCompare={(snap) => setCompare(snap)}
          onRestore={(snap) => onRestoreSnapshot(snap)}
          onDelete={(snap) => void onDeleteSnapshot(snap)}
          onClose={() => setShowSnapshots(false)}
        />
      )}
      {snapPrompt && (
        <SnapshotNameDialog
          defaultName={autoLabel("스냅샷")}
          onSave={(name) => { void takeSnapshot(name); setSnapPrompt(false); }}
          onClose={() => setSnapPrompt(false)}
        />
      )}
      {busy && <LoadingOverlay message={busy} />}
    </div>
  );
}
