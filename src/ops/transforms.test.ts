import { expect, test } from "vitest";
import { mergeValues, splitValue } from "./transforms";

test("mergeValues는 구분자로 여러 값을 합친다", () => {
  expect(mergeValues(["Kim", "Minsu"], " ")).toBe("Kim Minsu");
  expect(mergeValues(["a", null, "b"], "-")).toBe("a--b");
});

test("splitValue는 구분자로 값을 N개로 나눈다", () => {
  expect(splitValue("Kim Minsu", " ", 2)).toEqual(["Kim", "Minsu"]);
  expect(splitValue("Kim", " ", 2)).toEqual(["Kim", null]);
  expect(splitValue("a b c", " ", 2)).toEqual(["a", "b c"]);
});
