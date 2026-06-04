import { expect, test } from "vitest";
import { parseQuery } from "./query";

const cols = [
  { id: "c0", name: "이름" },
  { id: "c1", name: "나이" },
  { id: "c2", name: "도시" },
];

test("빈 쿼리는 빈 groups", () => {
  const r = parseQuery("", cols);
  expect(r).toEqual({ ok: true, groups: [] });
});

test("단일 비교 조건", () => {
  const r = parseQuery("나이 >= 30", cols);
  expect(r).toEqual({ ok: true, groups: [[{ colId: "c1", op: "gte", value: 30 }]] });
});

test("AND 결합은 한 그룹", () => {
  const r = parseQuery('나이 > 20 AND 도시 = "서울"', cols);
  expect(r).toEqual({
    ok: true,
    groups: [[
      { colId: "c1", op: "gt", value: 20 },
      { colId: "c2", op: "eq", value: "서울" },
    ]],
  });
});

test("OR는 그룹 분리", () => {
  const r = parseQuery('도시 = "서울" OR 도시 = "부산"', cols);
  expect(r).toEqual({
    ok: true,
    groups: [
      [{ colId: "c2", op: "eq", value: "서울" }],
      [{ colId: "c2", op: "eq", value: "부산" }],
    ],
  });
});

test("contains / is empty 연산자", () => {
  expect(parseQuery("이름 contains 김", cols)).toEqual({
    ok: true,
    groups: [[{ colId: "c0", op: "contains", value: "김" }]],
  });
  expect(parseQuery("도시 is empty", cols)).toEqual({
    ok: true,
    groups: [[{ colId: "c2", op: "empty" }]],
  });
});

test("알 수 없는 컬럼은 에러", () => {
  const r = parseQuery("몸무게 > 50", cols);
  expect(r.ok).toBe(false);
});

test("문법 오류는 에러", () => {
  const r = parseQuery("나이 >", cols);
  expect(r.ok).toBe(false);
});

test("스마트 따옴표(“ ”)도 일반 따옴표처럼 처리", () => {
  const r = parseQuery("도시 = “서울”", cols);
  expect(r).toEqual({ ok: true, groups: [[{ colId: "c2", op: "eq", value: "서울" }]] });
});
