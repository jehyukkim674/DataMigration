import { expect, test } from "vitest";
import { ColumnStore } from "../data/ColumnStore";
import { diffStores } from "./diff";

test("변경 셀 / 추가 / 삭제 행 + 컬럼 변화 감지", () => {
  const snap = ColumnStore.fromRows(
    [{ id: "a", name: "이름", type: "string" }, { id: "b", name: "나이", type: "number" }],
    [["Kim", 30], ["Lee", 25], ["Park", 40]],
  );
  const cur = ColumnStore.fromRows(
    [{ id: "a2", name: "이름", type: "string" }, { id: "c", name: "도시", type: "string" }],
    [["Kim", "서울"], ["Lee2", "부산"]], // 행2 변경, 행3 삭제, 컬럼 나이 삭제/도시 추가
  );
  const d = diffStores(cur, snap);
  expect(d.columnsAdded).toEqual(["도시"]);
  expect(d.columnsRemoved).toEqual(["나이"]);
  expect(d.removedRows).toBe(1); // Park
  expect(d.changedCellCount).toBe(1); // Lee→Lee2 (공통 컬럼 '이름'만 비교)
  const changed = d.rowDiffs.find((r) => r.status === "changed");
  expect(changed?.changes?.[0]).toMatchObject({ col: "이름", before: "Lee", after: "Lee2" });
});

test("동일하면 차이 없음", () => {
  const s = ColumnStore.fromRows([{ id: "a", name: "x", type: "number" }], [[1], [2]]);
  const d = diffStores(s, s);
  expect(d.rowDiffs).toEqual([]);
  expect(d.changedCellCount).toBe(0);
});
