import type { CellValue, DataType } from "../data/types";
import type { SplitMode } from "./transforms";

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
      // 조각 인덱스를 원하는 컬럼명에 매핑(제외된 조각은 제외). 스마트 쪼개기.
      kind: "splitColumnMap";
      sourceId: string;
      separator: string;
      mode?: SplitMode;
      parts: { index: number; id: string; name: string }[];
    }
  | {
      // 각 새 컬럼을 수식으로 계산(value/p0,p1… 사용). 조건식(if 등) 쪼개기.
      kind: "formulaColumns";
      sourceId: string;
      separator: string;
      mode: SplitMode;
      columns: { id: string; name: string; formula: string }[];
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
  | { kind: "deleteRows"; rows: number[] }
  | { kind: "insertRows"; rows: { index: number; cells: Record<string, CellValue> }[] }
  | { kind: "replaceInColumn"; colId: string; find: string; replace: string; regex?: boolean }
  | { kind: "setColumnValues"; colId: string; values: CellValue[] }
  | {
      // 두 컬럼(A·B)의 값 유무를 비교해 4경우별 값으로 새 컬럼 생성.
      kind: "compareColumns";
      id: string;
      name: string;
      aColId: string;
      bColId: string;
      outputs: { both: string; onlyA: string; onlyB: string; neither: string };
    }
  | { kind: "batch"; ops: Operation[] };

export function describeOperation(op: Operation): string {
  switch (op.kind) {
    case "editCell":
      return `셀 편집 (행 ${op.row + 1})`;
    case "mergeColumns":
      return `컬럼 합치기 → ${op.newColumnName}`;
    case "splitColumn":
      return `컬럼 쪼개기 (${op.sourceId})`;
    case "splitColumnMap":
      return `컬럼 쪼개기 → ${op.parts.length}개 컬럼`;
    case "formulaColumns":
      return `수식 쪼개기 → ${op.columns.length}개 컬럼`;
    case "newColumn":
      return `컬럼 생성 → ${op.name}`;
    case "deleteColumn":
      return `컬럼 삭제 (${op.colId})`;
    case "renameColumn":
      return `컬럼 이름 변경 → ${op.name}`;
    case "deleteRows":
      return `${op.rows.length}개 행 삭제`;
    case "insertRows":
      return `${op.rows.length}개 행 복원`;
    case "replaceInColumn":
      return `바꾸기 (${op.colId}): ${op.find}→${op.replace}`;
    case "setColumnValues":
      return `컬럼 값 복원 (${op.colId})`;
    case "compareColumns":
      return `조건부 컬럼 생성 → ${op.name}`;
    case "batch":
      return `${op.ops.length}개 작업 묶음`;
  }
}
