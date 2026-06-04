import { createPortal } from "react-dom";
import type { ColumnStore } from "../data/ColumnStore";
import type { VisibleColumn } from "../view/computeView";

interface Props {
  store: ColumnStore;
  columns: VisibleColumn[];
  rows: number[]; // 삭제할 원본 행 인덱스
  onConfirm: () => void;
  onCancel: () => void;
}

const PREVIEW_LIMIT = 300;
const COL_LIMIT = 8;

/** 삭제될 행 전체 목록을 보여주고 확인받는 다이얼로그. */
export function RowDeleteConfirm({ store, columns, rows, onConfirm, onCancel }: Props) {
  const cols = columns.slice(0, COL_LIMIT);
  const shown = rows.slice(0, PREVIEW_LIMIT);

  return createPortal(
    <div onMouseDown={onCancel} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 720, maxHeight: "82vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#c0392b", color: "#fff" }}>
          <strong>행 삭제 확인</strong>
          <button onClick={onCancel} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: "10px 14px", fontSize: 14 }}>
          <b>{rows.length.toLocaleString()}개</b> 행을 삭제합니다. 아래 목록을 확인하세요. (되돌리기 가능)
        </div>

        <div style={{ overflow: "auto", margin: "0 14px", border: "1px solid #eee", borderRadius: 6 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
            <thead>
              <tr style={{ background: "#f5f5f7", position: "sticky", top: 0 }}>
                <th style={th}>#</th>
                {cols.map((c) => (<th key={c.id} style={th}>{c.name}</th>))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r}>
                  <td style={{ ...td, color: "#999" }}>{r + 1}</td>
                  {cols.map((c) => {
                    const v = store.getCell(r, c.id);
                    return <td key={c.id} style={td}>{v === null ? "" : String(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > PREVIEW_LIMIT && (
            <div style={{ padding: 8, color: "#999", fontSize: 12 }}>…외 {(rows.length - PREVIEW_LIMIT).toLocaleString()}개 행</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 14px" }}>
          <button onClick={onCancel} style={{ padding: "6px 14px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer" }}>취소</button>
          <button onClick={onConfirm} style={{ padding: "6px 16px", fontSize: 13, background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {rows.length.toLocaleString()}개 행 삭제
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #e5e5e5", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" };
