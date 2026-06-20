import { expect, test } from "vitest";
import { evalFormula, validateFormula } from "./formula";

const vars = { value: "CentOs 5.3 LTS", parts: ["CentOs", "5.3", "LTS"] };

test("변수/조각 참조", () => {
  expect(evalFormula("value", vars)).toBe("CentOs 5.3 LTS");
  expect(evalFormula("p0", vars)).toBe("CentOs");
  expect(evalFormula("p1", vars)).toBe("5.3");
  expect(evalFormula("p9", vars)).toBe(""); // 범위 밖
});

test("if + contains 조건식", () => {
  expect(evalFormula('if(contains(value, "LTS"), "장기지원", "일반")', vars)).toBe("장기지원");
  expect(evalFormula('if(contains(value, "XYZ"), "y", "n")', vars)).toBe("n");
});

test("if로 특정 조각 제외", () => {
  // p2가 LTS면 빈 값, 아니면 p2
  expect(evalFormula('if(eq(p2, "LTS"), "", p2)', vars)).toBe("");
  expect(evalFormula('if(eq(p2, "GA"), "", p2)', vars)).toBe("LTS");
});

test("extract 정규식 캡처", () => {
  expect(evalFormula('extract(value, "([0-9.]+)", 1)', vars)).toBe("5.3");
  expect(evalFormula('extract(value, "([A-Za-z]+)", 0)', vars)).toBe("CentOs");
});

test("숫자 비교 + concat + 함수", () => {
  expect(evalFormula('if(gt(p1, "5"), "high", "low")', vars)).toBe("high"); // 5.3 > 5
  expect(evalFormula('concat(p0, "-", p1)', vars)).toBe("CentOs-5.3");
  expect(evalFormula("upper(p0)", vars)).toBe("CENTOS");
  expect(evalFormula('replace(value, " ", "_")', vars)).toBe("CentOs_5.3_LTS");
});

test("and/or/not", () => {
  expect(evalFormula('if(and(contains(value,"Cent"), contains(value,"LTS")), "y", "n")', vars)).toBe("y");
  expect(evalFormula('if(or(eq(p0,"X"), eq(p1,"5.3")), "y", "n")', vars)).toBe("y");
  expect(evalFormula('not(eq(p0,"X"))', vars)).toBe("true");
});

test("여러 줄 + 변수 지정", () => {
  const f = `ver = extract(value, "([0-9.]+)", 1)
if(gt(ver, "5"), concat("v", ver), "old")`;
  expect(evalFormula(f, vars)).toBe("v5.3"); // 5.3 > 5
  expect(validateFormula(f)).toBeNull();
  const f2 = `a = "X"\nb = concat(a, p0)\nb`;
  expect(evalFormula(f2, vars)).toBe("XCentOs");
});

test("결과 식 없으면(지정만) 에러", () => {
  expect(validateFormula('x = "1"')).toBeTruthy();
});

test("나머지 함수/연산자 커버리지", () => {
  const v = { value: "Hello World", parts: ["Hello", "World"] };
  expect(evalFormula('ne(p0, "x")', v)).toBe("true");
  expect(evalFormula('gte(p0, p0)', { value: "5", parts: ["5"] })).toBe("true");
  expect(evalFormula('lte("3", "5")', v)).toBe("true");
  expect(evalFormula('lower(value)', v)).toBe("hello world");
  expect(evalFormula('trim("  x  ")', v)).toBe("x");
  expect(evalFormula('startsWith(value, "Hel")', v)).toBe("true");
  expect(evalFormula('endsWith(value, "rld")', v)).toBe("true");
  expect(evalFormula('matches(value, "W[a-z]+")', v)).toBe("true");
  expect(evalFormula('matches(value, "(")', v)).toBe(""); // 잘못된 정규식
  expect(evalFormula('extract(value, "zzz", 1)', v)).toBe(""); // 매치 없음
  expect(evalFormula('not(or(eq(p0,"x"), eq(p1,"y")))', v)).toBe("true");
  expect(evalFormula('unknownFn(p0)', v)).toBe(""); // 알 수 없는 함수 → 빈 문자열
  expect(evalFormula('@', v)).toBe(""); // 토큰화 오류
});

test("문자열 함수: len/substr/padStart/padEnd/repeat/coalesce", () => {
  const v = { value: "abcdef", parts: ["", "5", "x"] };
  expect(evalFormula("len(value)", v)).toBe("6");
  expect(evalFormula("substr(value, 1, 3)", v)).toBe("bcd");
  expect(evalFormula("substr(value, 4)", v)).toBe("ef");
  expect(evalFormula('padStart(p1, 3, "0")', v)).toBe("005");
  expect(evalFormula('padEnd(p1, 3, "_")', v)).toBe("5__");
  expect(evalFormula('repeat("ab", 3)', v)).toBe("ababab");
  // coalesce: 첫 비어있지 않은 값(p0은 빈 문자열).
  expect(evalFormula("coalesce(p0, p1, p2)", v)).toBe("5");
  expect(evalFormula("coalesce(p0, p0)", v)).toBe("");
});

test("repeat 횟수는 0~10000으로 제한(폭주 방지)", () => {
  expect(evalFormula('repeat("a", -5)', vars)).toBe("");
});

test("잘못된 수식은 빈 문자열, validateFormula는 에러 메시지", () => {
  expect(evalFormula("if(contains(", vars)).toBe("");
  expect(validateFormula("if(contains(")).toBeTruthy();
  expect(validateFormula('if(eq(p2,"x"), "", p2)')).toBeNull();
});
