import { useCallback, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ColumnStore } from "../data/ColumnStore";
import { History } from "../ops/history";
import type { Operation } from "../ops/operations";
import { DataGrid } from "../grid/DataGrid";
import { Toolbar } from "./Toolbar";
import { importFileDialog } from "../io/importFile";
import { exportFileDialog } from "../io/exportFile";
import { checkUpdateStatus } from "../core/updater";
import { EMPTY_VIEW, toggleHidden, setSort, setColumnFilter, type ViewState, type FilterCondition, type SortDir } from "../view/viewState";
import { computeView } from "../view/computeView";
import { QueryBar } from "./QueryBar";
import { ColumnVisibility } from "./ColumnVisibility";
import { ColumnMenu } from "./ColumnMenu";
import { useAppZoom } from "./useAppZoom";

const EMPTY = ColumnStore.fromRows([], []);

export function RootView() {
  const historyRef = useRef(new History(EMPTY));
  const [, forceRender] = useState(0);
  const [view, setView] = useState<ViewState>(EMPTY_VIEW);
  const [menu, setMenu] = useState<{ colId: string; x: number; y: number } | null>(null);
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
  const computed = computeView(store, view);
  const zoom = useAppZoom();

  const onImport = useCallback(async () => {
    const s = await importFileDialog();
    if (s) {
      historyRef.current = new History(s);
      rerender();
    }
  }, [rerender]);

  const onExport = useCallback(
    () => exportFileDialog(store, { columnIds: computed.visibleColumns.map((c) => c.id), rowOrder: computed.rowOrder }),
    [store, computed],
  );

  const onHeaderMenu = useCallback((colId: string, pos: { x: number; y: number }) => {
    setMenu({ colId, x: pos.x, y: pos.y });
  }, []);

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

  const onSplit = useCallback(() => {
    const id = prompt("쪼갤 컬럼 id (예: col0)");
    if (!id) return;
    apply({
      kind: "splitColumn",
      sourceId: id,
      separator: " ",
      newColumns: [
        { id: `c_${Date.now()}_a`, name: "part1" },
        { id: `c_${Date.now()}_b`, name: "part2" },
      ],
    });
  }, [apply]);

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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", zoom }}>
      <Toolbar
        onImport={onImport}
        onExport={onExport}
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
        onNewColumn={onNewColumn}
        onCheckUpdate={onCheckUpdate}
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
                  <QueryBar initial={view.query} error={computed.queryError} columns={store.columns.map((c) => c.name)} onApply={(q) => setView((v) => ({ ...v, query: q }))} />
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
                    />
                  </div>
                </>
              )}
            </div>
          </Panel>
          <PanelResizeHandle style={{ width: 4, background: "#eee" }} />
          <Panel defaultSize={25} minSize={15}>
            <div style={{ padding: 12 }}>
              <ColumnVisibility store={store} hidden={view.hiddenColumns} onToggle={(id) => setView((v) => toggleHidden(v, id))} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}>
                <button onClick={() => setView(EMPTY_VIEW)}>뷰 초기화</button>
                <span style={{ fontSize: 12, color: "#888" }}>{computed.rowOrder.length} / {store.rowCount} 행</span>
              </div>
              <h3 style={{ marginTop: 0 }}>히스토리</h3>
              <ol style={{ fontSize: 13, paddingLeft: 18 }}>
                {historyRef.current.entries.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ol>
              <p style={{ color: "#aaa", fontSize: 12 }}>
                (다음 단계에서 AI 패널이 들어갑니다)
              </p>
            </div>
          </Panel>
        </PanelGroup>
      </div>
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
          onFilter={(cond: FilterCondition | null) => { setView((v) => setColumnFilter(v, menu.colId, cond)); setMenu(null); }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
