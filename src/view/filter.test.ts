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

test("contains/startsWith/endsWith는 대소문자 무시(like와 일관)", () => {
  expect(evalCondition("IBM Korea", { colId: "x", op: "contains", value: "ibm" })).toBe(true);
  expect(evalCondition("IBM Korea", { colId: "x", op: "startsWith", value: "ibm" })).toBe(true);
  expect(evalCondition("server.LOG", { colId: "x", op: "endsWith", value: "log" })).toBe(true);
});

test("빈 셀은 숫자 비교에서 0이 아니라 비교 불가(항상 false)", () => {
  expect(evalCondition("", { colId: "x", op: "gt", value: -1 })).toBe(false);
  expect(evalCondition(null, { colId: "x", op: "gte", value: 0 })).toBe(false);
  expect(evalCondition("", { colId: "x", op: "lt", value: 100 })).toBe(false);
});

test("빈 값 연산자", () => {
  expect(evalCondition(null, { colId: "x", op: "empty" })).toBe(true);
  expect(evalCondition("", { colId: "x", op: "empty" })).toBe(true);
  expect(evalCondition("a", { colId: "x", op: "notEmpty" })).toBe(true);
});

test("eq는 숫자/문자 혼합도 문자열로 느슨히 비교", () => {
  expect(evalCondition(30, { colId: "x", op: "eq", value: "30" })).toBe(true);
});

test("in은 선택된 값 집합 포함 여부", () => {
  expect(evalCondition("서울", { colId: "x", op: "in", values: ["서울", "부산"] })).toBe(true);
  expect(evalCondition("대구", { colId: "x", op: "in", values: ["서울", "부산"] })).toBe(false);
  expect(evalCondition(30, { colId: "x", op: "in", values: [30, 40] })).toBe(true);
});

test("like는 % / _ 와일드카드(대소문자 무시)", () => {
  expect(evalCondition("IBM Korea", { colId: "x", op: "like", value: "IBM%" })).toBe(true);
  expect(evalCondition("HP Korea", { colId: "x", op: "like", value: "IBM%" })).toBe(false);
  expect(evalCondition("ibm", { colId: "x", op: "like", value: "IBM" })).toBe(true);
  expect(evalCondition("A1", { colId: "x", op: "like", value: "A_" })).toBe(true);
  expect(evalCondition("A12", { colId: "x", op: "like", value: "A_" })).toBe(false);
  expect(evalCondition("서울특별시", { colId: "x", op: "like", value: "%특별%" })).toBe(true);
});
