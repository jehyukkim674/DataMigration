import { useCallback, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ColumnStore } from "../data/ColumnStore";
import { History } from "../ops/history";
import type { Operation } from "../ops/operations";
import { DataGrid } from "../grid/DataGrid";
import { Toolbar } from "./Toolbar";
import { importFileDialog } from "../io/importFile";
import { exportFileDialog } from "../io/exportFile";

const EMPTY = ColumnStore.fromRows([], []);

export function RootView() {
  const historyRef = useRef(new History(EMPTY));
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  const apply = useCallback(
    (op: Operation) => {
      historyRef.current.apply(op);
      rerender();
    },
    [rerender],
  );

  const store = historyRef.current.store;

  const onImport = useCallback(async () => {
    const s = await importFileDialog();
    if (s) {
      historyRef.current = new History(s);
      rerender();
    }
  }, [rerender]);

  const onExport = useCallback(() => exportFileDialog(store), [store]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
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
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={75} minSize={40}>
            <div style={{ height: "100%" }}>
              {store.rowCount === 0 ? (
                <div style={{ padding: 24, color: "#888" }}>
                  파일을 가져오세요 (가져오기 버튼)
                </div>
              ) : (
                <DataGrid store={store} onEditCell={onEditCell} />
              )}
            </div>
          </Panel>
          <PanelResizeHandle style={{ width: 4, background: "#eee" }} />
          <Panel defaultSize={25} minSize={15}>
            <div style={{ padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>히스토리</h3>
              <ol style={{ fontSize: 13, paddingLeft: 18 }}>
                {historyRef.current.entries.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ol>
              <p style={{ color: "#aaa", fontSize: 12 }}>
                (M2에서 이 자리에 AI 패널이 들어갑니다)
              </p>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
