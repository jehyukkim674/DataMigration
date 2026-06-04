import { expect, test } from "vitest";
import { evalCondition } from "./filter";

test("숫자 비교 연산자", () => {
  expect(evalCondition(30, { colId: "x", op: "gt", value: 20 })).toBe(true);
  expect(evalCondition(30, { colId: "x", op: "lte", value: 30 })).toBe(true);
  expect(evalCondition(30, { colId: "x", op: "lt", value: 30 })).toBe(false);
});

test("문자 연산자", () => {
  expect(evalCondition("서울특별시", { colId: "x", op: "contains", value: "특별" })).toBe(true);
  expect(evalCondition("서울", { colId: "x", op: "startsWith", value: "서" })).toBe(true);
  expect(evalCondition("서울", { colId: "x", op: "eq", value: "서울" })).toBe(true);
  expect(evalCondition("서울", { colId: "x", op: "neq", value: "부산" })).toBe(true);
});

test("빈 값 연산자", () => {
  expect(evalCondition(null, { colId: "x", op: "empty" })).toBe(true);
  expect(evalCondition("", { colId: "x", op: "empty" })).toBe(true);
  expect(evalCondition("a", { colId: "x", op: "notEmpty" })).toBe(true);
});

test("eq는 숫자/문자 혼합도 문자열로 느슨히 비교", () => {
  expect(evalCondition(30, { colId: "x", op: "eq", value: "30" })).toBe(true);
});
