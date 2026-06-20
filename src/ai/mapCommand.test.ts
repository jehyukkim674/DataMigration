import { expect, test } from "vitest";
import { mapCommands, applyMutations, mutationsToView } from "./mapCommand";
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

test("splitColumn / mergeColumns / hideColumn / clearView / sort 매핑", () => {
  counter = 0;
  const r = mapCommands(
    [
      { action: "splitColumn", columnName: "이름", separator: " " },
      { action: "mergeColumns", columnNames: ["이름", "도시"], separator: "-", newColumnName: "합본" },
      { action: "hideColumn", columnName: "도시" },
      { action: "clearView" },
      { action: "sort", columnName: "나이", direction: "asc" },
    ],
    cols, genId,
  );
  expect(r.errors).toEqual([]);
  expect(r.ops.map((o) => o.kind)).toEqual(["splitColumn", "mergeColumns"]);
  expect(r.mutations.map((m) => m.type)).toEqual(["hide", "clear", "sort"]);
});

test("mergeColumns에 알 수 없는 컬럼이면 에러", () => {
  const r = mapCommands([{ action: "mergeColumns", columnNames: ["이름", "없음"] }], cols, genId);
  expect(r.errors.length).toBe(1);
  expect(r.ops).toEqual([]);
});

test("splitColumnMap 명령 → splitColumnMap Operation(조각 매핑)", () => {
  counter = 0;
  const r = mapCommands(
    [{
      action: "splitColumnMap",
      columnName: "이름",
      separator: " ",
      splitParts: [{ index: 0, name: "성" }, { index: 1, name: "이름2" }],
    }],
    cols, genId,
  );
  expect(r.errors).toEqual([]);
  expect(r.ops).toHaveLength(1);
  expect(r.ops[0]).toMatchObject({
    kind: "splitColumnMap",
    sourceId: "c0",
    separator: " ",
    parts: [
      { index: 0, name: "성" },
      { index: 1, name: "이름2" },
    ],
  });
});

test("replaceInColumn 매핑", () => {
  const r = mapCommands(
    [{ action: "replaceInColumn", columnName: "도시", find: "광역시", replaceWith: "", regexFlag: false }],
    cols, genId,
  );
  expect(r.errors).toEqual([]);
  expect(r.ops[0]).toMatchObject({ kind: "replaceInColumn", colId: "c2", find: "광역시", replace: "", regex: false });
});

test("editCell / newColumn / deleteColumn / renameColumn 매핑", () => {
  const r = mapCommands(
    [
      { action: "editCell", columnName: "이름", row: 0, value: "X" },
      { action: "newColumn", newColumnName: "메모", value: "기본" },
      { action: "deleteColumn", columnName: "도시" },
      { action: "renameColumn", columnName: "나이", newColumnName: "연령" },
    ],
    cols, genId,
  );
  expect(r.errors).toEqual([]);
  expect(r.ops.map((o) => o.kind)).toEqual(["editCell", "newColumn", "deleteColumn", "renameColumn"]);
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

test("mutationsToView는 필터를 WHERE 쿼리 텍스트로 합친다", () => {
  const v = mutationsToView(
    EMPTY_VIEW,
    [{ type: "filter", cond: { colId: "c0", op: "contains", value: "김" } }],
    cols,
  );
  expect(v.query).toBe('이름 contains "김"');
  expect(v.filters).toEqual([]); // 구조화 필터 아님

  // 기존 쿼리에 AND로 이어붙임 + 정렬은 그대로
  const v2 = mutationsToView(
    { ...EMPTY_VIEW, query: "나이 > 30" },
    [
      { type: "filter", cond: { colId: "c2", op: "eq", value: "서울" } },
      { type: "sort", colId: "c1", dir: "desc" },
    ],
    cols,
  );
  expect(v2.query).toBe('나이 > 30 AND 도시 = "서울"');
  expect(v2.sorts).toEqual([{ colId: "c1", dir: "desc" }]);
});

test("값에 큰따옴표가 있으면 쿼리 대신 구조화 필터로 둔다(WHERE 문법 보호)", () => {
  const v = mutationsToView(
    EMPTY_VIEW,
    [{ type: "filter", cond: { colId: "c0", op: "eq", value: '김"철수' } }],
    cols,
  );
  expect(v.query).toBe(""); // 깨진 쿼리를 만들지 않음
  expect(v.filters).toEqual([{ colId: "c0", op: "eq", value: '김"철수' }]);
});

test("clear mutation은 뷰 초기화", () => {
  const v = applyMutations({ hiddenColumns: ["c2"], sorts: [], filters: [], query: "" }, [{ type: "clear" }]);
  expect(v.hiddenColumns).toEqual([]);
});
