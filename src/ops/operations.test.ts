import { expect, test } from "vitest";
import { describeOperation, type Operation } from "./operations";

test("describeOperation은 사람이 읽는 한 줄 설명을 만든다", () => {
  const op: Operation = { kind: "editCell", colId: "c1", row: 0, value: "X" };
  expect(describeOperation(op)).toContain("셀 편집");

  const merge: Operation = {
    kind: "mergeColumns",
    sourceIds: ["c1", "c2"],
    separator: " ",
    newColumnId: "c3",
    newColumnName: "fullname",
  };
  expect(describeOperation(merge)).toContain("합치기");
});

test("describeOperation은 모든 연산 종류를 설명한다", () => {
  const cases: [Operation, string][] = [
    [{ kind: "splitColumn", sourceId: "c", separator: " ", newColumns: [] }, "쪼개기"],
    [{ kind: "splitColumnMap", sourceId: "c", separator: " ", parts: [] }, "쪼개기"],
    [{ kind: "formulaColumns", sourceId: "c", separator: " ", mode: "separator", columns: [] }, "수식"],
    [{ kind: "newColumn", id: "c", name: "n", type: "string", fillValue: "" }, "생성"],
    [{ kind: "deleteColumn", colId: "c" }, "삭제"],
    [{ kind: "renameColumn", colId: "c", name: "n" }, "이름 변경"],
    [{ kind: "deleteRows", rows: [1, 2] }, "행 삭제"],
    [{ kind: "insertRows", rows: [] }, "복원"],
    [{ kind: "replaceInColumn", colId: "c", find: "a", replace: "b" }, "바꾸기"],
    [{ kind: "setColumnValues", colId: "c", values: [] }, "값 복원"],
    [{ kind: "compareColumns", id: "x", name: "정합성", aColId: "a", bColId: "b", outputs: { bothSame: "", bothDiff: "", onlyA: "", onlyB: "", neither: "" } }, "조건부 컬럼"],
    [{ kind: "batch", ops: [] }, "작업 묶음"],
  ];
  for (const [op, expected] of cases) {
    expect(describeOperation(op)).toContain(expected);
  }
});
