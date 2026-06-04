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
