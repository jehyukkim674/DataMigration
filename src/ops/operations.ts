import type { CellValue, DataType } from "../data/types";

export type Operation =
  | { kind: "editCell"; colId: string; row: number; value: CellValue }
  | {
      kind: "mergeColumns";
      sourceIds: string[];
      separator: string;
      newColumnId: string;
      newColumnName: string;
    }
  | {
      kind: "splitColumn";
      sourceId: string;
      separator: string;
      newColumns: { id: string; name: string }[];
    }
  | {
      kind: "newColumn";
      id: string;
      name: string;
      type: DataType;
      fillValue: CellValue;
    }
  | { kind: "deleteColumn"; colId: string }
  | { kind: "renameColumn"; colId: string; name: string }
  | { kind: "batch"; ops: Operation[] };

export function describeOperation(op: Operation): string {
  switch (op.kind) {
    case "editCell":
      return `셀 편집 (행 ${op.row + 1})`;
    case "mergeColumns":
      return `컬럼 합치기 → ${op.newColumnName}`;
    case "splitColumn":
      return `컬럼 쪼개기 (${op.sourceId})`;
    case "newColumn":
      return `컬럼 생성 → ${op.name}`;
    case "deleteColumn":
      return `컬럼 삭제 (${op.colId})`;
    case "renameColumn":
      return `컬럼 이름 변경 → ${op.name}`;
    case "batch":
      return `${op.ops.length}개 작업 묶음`;
  }
}
