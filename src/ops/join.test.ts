import { expect, test } from "vitest";
import { joinTables, type Table } from "./join";

const a: Table = {
  columns: [
    { name: "id", type: "string" },
    { name: "이름", type: "string" },
  ],
  rows: [
    ["1", "Kim"],
    ["2", "Lee"],
    ["3", "Park"],
  ],
};
const b: Table = {
  columns: [
    { name: "id", type: "string" },
    { name: "도시", type: "string" },
  ],
  rows: [
    ["1", "서울"],
    ["2", "부산"],
    ["9", "대구"],
  ],
};

test("inner join: 매칭되는 행만", () => {
  const r = joinTables(a, 0, b, 0, "inner");
  expect(r.columns.map((c) => c.name)).toEqual(["id", "이름", "id (B)", "도시"]);
  expect(r.rows).toEqual([
    ["1", "Kim", "1", "서울"],
    ["2", "Lee", "2", "부산"],
  ]);
});

test("left join: a 전부, 매칭 없으면 b쪽 null", () => {
  const r = joinTables(a, 0, b, 0, "left");
  expect(r.rows).toEqual([
    ["1", "Kim", "1", "서울"],
    ["2", "Lee", "2", "부산"],
    ["3", "Park", null, null], // Park은 b에 없음
  ]);
});

test("full join: 매칭 안 된 b 행도 a쪽 null로 추가", () => {
  const r = joinTables(a, 0, b, 0, "full");
  expect(r.rows).toEqual([
    ["1", "Kim", "1", "서울"],
    ["2", "Lee", "2", "부산"],
    ["3", "Park", null, null],
    [null, null, "9", "대구"], // 대구는 a에 없음
  ]);
});

test("키 컬럼 이름 충돌 시 출처 라벨로 구분", () => {
  const r = joinTables(a, 0, b, 0, "inner", { a: "A.csv", b: "B.csv" });
  expect(r.columns[2].name).toBe("id (B.csv)");
  expect(r.sources).toEqual(["A.csv", "A.csv", "B.csv", "B.csv"]);
});
