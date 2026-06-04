import type { ColumnStore } from "../data/ColumnStore";
import type { CellValue } from "../data/types";

export interface CellChange {
  col: string;
  before: CellValue;
  after: CellValue;
}
export interface RowDiff {
  index: number;
  status: "added" | "removed" | "changed";
  changes?: CellChange[];
}
export interface StoreDiff {
  columnsAdded: string[];
  columnsRemoved: string[];
  rowDiffs: RowDiff[];
  changedCellCount: number;
  addedRows: number;
  removedRows: number;
}

function eq(a: CellValue, b: CellValue): boolean {
  return String(a ?? "") === String(b ?? "");
}

/**
 * 현재 데이터 vs 스냅샷을 행 인덱스 기준으로 비교(구글 시트 버전 비교 느낌).
 * 컬럼은 이름으로 매칭. 공통 행은 셀 단위로 비교해 변경 셀을 수집한다.
 */
export function diffStores(current: ColumnStore, snapshot: ColumnStore): StoreDiff {
  const snapByName = new Map(snapshot.columns.map((c) => [c.name, c.id]));
  const curNames = new Set(current.columns.map((c) => c.name));
  const columnsAdded = current.columns.filter((c) => !snapByName.has(c.name)).map((c) => c.name);
  const columnsRemoved = snapshot.columns.filter((c) => !curNames.has(c.name)).map((c) => c.name);
  const common = current.columns
    .filter((c) => snapByName.has(c.name))
    .map((c) => ({ name: c.name, curId: c.id, snapId: snapByName.get(c.name)! }));

  const maxRows = Math.max(current.rowCount, snapshot.rowCount);
  const rowDiffs: RowDiff[] = [];
  let changedCellCount = 0;
  let addedRows = 0;
  let removedRows = 0;

  for (let i = 0; i < maxRows; i++) {
    if (i >= snapshot.rowCount) {
      rowDiffs.push({ index: i, status: "added" });
      addedRows++;
      continue;
    }
    if (i >= current.rowCount) {
      rowDiffs.push({ index: i, status: "removed" });
      removedRows++;
      continue;
    }
    const changes: CellChange[] = [];
    for (const c of common) {
      const before = snapshot.getCell(i, c.snapId);
      const after = current.getCell(i, c.curId);
      if (!eq(before, after)) changes.push({ col: c.name, before, after });
    }
    if (changes.length) {
      rowDiffs.push({ index: i, status: "changed", changes });
      changedCellCount += changes.length;
    }
  }

  return { columnsAdded, columnsRemoved, rowDiffs, changedCellCount, addedRows, removedRows };
}
