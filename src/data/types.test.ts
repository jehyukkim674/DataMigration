import { expect, test } from "vitest";
import { type CellValue, isEmpty, normalizeType } from "./types";

test("isEmpty는 null/빈문자열을 빈 값으로 본다", () => {
  expect(isEmpty(null)).toBe(true);
  expect(isEmpty("")).toBe(true);
  expect(isEmpty(0 as CellValue)).toBe(false);
  expect(isEmpty("a")).toBe(false);
});

test("normalizeType은 알 수 없는 타입을 string으로 강등한다", () => {
  expect(normalizeType("number")).toBe("number");
  expect(normalizeType("string")).toBe("string");
  expect(normalizeType("weird")).toBe("string");
});
