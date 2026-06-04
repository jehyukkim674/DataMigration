import { expect, test } from "vitest";
import { mapCommands, applyMutations } from "./mapCommand";
import { EMPTY_VIEW } from "../view/viewState";

const cols = [
  { id: "c0", name: "이름" },
  { id: "c1", name: "나이" },
  { id: "c2", name: "도시" },
];
let counter = 0;
const genId = () => `gen${counter++}`;

test("filter 명령 → ViewMutation", () => {
  const r = mapCommands([{ action: "filter", columnName: "나이", op: ">", value: "30" }], cols, genId);
  expect(r.errors).toEqual([]);
  expect(r.mutations).toEqual([{ type: "filter", cond: { colId: "c1", op: "gt", value: 30 } }]);
});

test("sort 명령 → ViewMutation", () => {
  const r = mapCommands([{ action: "sort", columnName: "나이", direction: "desc" }], cols, genId);
  expect(r.mutations).toEqual([{ type: "sort", colId: "c1", dir: "desc" }]);
});

test("hideColumn / clearView", () => {
  expect(mapCommands([{ action: "hideColumn", columnName: "도시" }], cols, genId).mutations)
    .toEqual([{ type: "hide", colId: "c2" }]);
  expect(mapCommands([{ action: "clearView" }], cols, genId).mutations)
    .toEqual([{ type: "clear" }]);
});

test("splitColumn 명령 → Operation", () => {
  counter = 0;
  const r = mapCommands([{ action: "splitColumn", columnName: "이름", separator: " " }], cols, genId);
  expect(r.ops).toHaveLength(1);
  expect(r.ops[0]).toMatchObject({ kind: "splitColumn", sourceId: "c0", separator: " " });
});

test("알 수 없는 컬럼은 error로 수집하고 건너뜀", () => {
  const r = mapCommands([{ action: "filter", columnName: "몸무게", op: ">", value: "1" }], cols, genId);
  expect(r.errors.length).toBe(1);
  expect(r.mutations).toEqual([]);
});

test("applyMutations는 mutation들을 ViewState에 적용", () => {
  const v = applyMutations(EMPTY_VIEW, [
    { type: "filter", cond: { colId: "c1", op: "gt", value: 30 } },
    { type: "sort", colId: "c1", dir: "desc" },
    { type: "hide", colId: "c2" },
  ]);
  expect(v.filters).toEqual([{ colId: "c1", op: "gt", value: 30 }]);
  expect(v.sorts).toEqual([{ colId: "c1", dir: "desc" }]);
  expect(v.hiddenColumns).toEqual(["c2"]);
});

test("clear mutation은 뷰 초기화", () => {
  const v = applyMutations({ hiddenColumns: ["c2"], sorts: [], filters: [], query: "" }, [{ type: "clear" }]);
  expect(v.hiddenColumns).toEqual([]);
});
