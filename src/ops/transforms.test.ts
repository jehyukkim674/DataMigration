import { expect, test } from "vitest";
import { mergeValues, splitPiece, splitValue } from "./transforms";

test("splitPiece는 index번째 조각을 반환(잔여분 흡수 없음)", () => {
  expect(splitPiece("CentOs 5.3 LTS", " ", 0)).toBe("CentOs");
  expect(splitPiece("CentOs 5.3 LTS", " ", 1)).toBe("5.3");
  expect(splitPiece("CentOs 5.3 LTS", " ", 2)).toBe("LTS");
  expect(splitPiece("CentOs 5.3 LTS", " ", 3)).toBeNull();
  expect(splitPiece("CentOs", " ", 1)).toBeNull();
  expect(splitPiece(null, " ", 0)).toBeNull();
});

test("mergeValues는 구분자로 여러 값을 합친다", () => {
  expect(mergeValues(["Kim", "Minsu"], " ")).toBe("Kim Minsu");
  expect(mergeValues(["a", null, "b"], "-")).toBe("a--b");
});

test("splitValue는 구분자로 값을 N개로 나눈다", () => {
  expect(splitValue("Kim Minsu", " ", 2)).toEqual(["Kim", "Minsu"]);
  expect(splitValue("Kim", " ", 2)).toEqual(["Kim", null]);
  expect(splitValue("a b c", " ", 2)).toEqual(["a", "b c"]);
});
