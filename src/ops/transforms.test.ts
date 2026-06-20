import { expect, test } from "vitest";
import { mergeValues, replaceCell, splitPiece, splitValue } from "./transforms";

test("replaceCell 리터럴/정규식 치환", () => {
  expect(replaceCell("서울특별시", "특별시", "", false)).toBe("서울");
  expect(replaceCell("a-b-c", "-", "_", false)).toBe("a_b_c");
  expect(replaceCell("ID001", "[0-9]+", "#", true)).toBe("ID#");
  expect(replaceCell("전체삭제", "전체삭제", "", false)).toBeNull(); // 빈 결과 → null
  expect(replaceCell(null, "x", "y", false)).toBeNull();
});

test("splitPiece는 index번째 조각을 반환(잔여분 흡수 없음)", () => {
  expect(splitPiece("CentOs 5.3 LTS", " ", 0)).toBe("CentOs");
  expect(splitPiece("CentOs 5.3 LTS", " ", 1)).toBe("5.3");
  expect(splitPiece("CentOs 5.3 LTS", " ", 2)).toBe("LTS");
  expect(splitPiece("CentOs 5.3 LTS", " ", 3)).toBeNull();
  expect(splitPiece("CentOs", " ", 1)).toBeNull();
  expect(splitPiece(null, " ", 0)).toBeNull();
});

test("splitPiece 정규식 분리 모드", () => {
  expect(splitPiece("11A-07-01", "[-]", 0, "regex")).toBe("11A");
  expect(splitPiece("11A-07-01", "[-]", 2, "regex")).toBe("01");
  expect(splitPiece("4 / 1201", "\\s*/\\s*", 1, "regex")).toBe("1201");
  expect(splitPiece("abc", "(", 0, "regex")).toBe("abc"); // 잘못된 정규식 → 분리 안 함
});

test("splitPiece 정규식 캡처 모드(그룹)", () => {
  expect(splitPiece("CentOs 5.3 LTS", "([A-Za-z]+) ([0-9.]+)", 0, "capture")).toBe("CentOs");
  expect(splitPiece("CentOs 5.3 LTS", "([A-Za-z]+) ([0-9.]+)", 1, "capture")).toBe("5.3");
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

test("splitValue 빈 구분자는 글자 단위로 쪼개지 않고 전체를 첫 조각에", () => {
  expect(splitValue("abc", "", 2)).toEqual(["abc", null]);
  expect(splitValue("abc", "", 1)).toEqual(["abc"]);
});
