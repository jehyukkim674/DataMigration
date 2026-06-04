import { expect, test } from "vitest";
import { getSuggestions } from "./queryAutocomplete";

const cols = ["이름", "나이", "도시", "성과 이름"];

test("절 시작에서는 컬럼 추천", () => {
  const s = getSuggestions("", "나", cols);
  expect(s.map((x) => x.text)).toContain("나이");
});

test("컬럼 뒤에는 연산자 추천(빈 토큰이면 전체)", () => {
  const s = getSuggestions("나이 ", "", cols);
  expect(s.map((x) => x.text)).toEqual(expect.arrayContaining(["=", ">", "like"]));
});

test("조건 뒤에는 AND/OR 추천", () => {
  const s = getSuggestions("나이 > 30 ", "", cols);
  expect(s.map((x) => x.text)).toEqual(expect.arrayContaining(["AND", "OR"]));
});

test("AND 뒤에는 다시 컬럼", () => {
  const s = getSuggestions("나이 > 30 AND ", "도", cols);
  expect(s.map((x) => x.text)).toContain("도시");
});

test("공백 포함 컬럼은 따옴표로 insert", () => {
  const s = getSuggestions("", "성과", cols);
  const hit = s.find((x) => x.text === "성과 이름");
  expect(hit?.insert).toBe('"성과 이름" ');
});

test("연산자 insert는 뒤에 공백", () => {
  const s = getSuggestions("나이 ", "li", cols);
  expect(s.find((x) => x.text === "like")?.insert).toBe("like ");
});

test("빈 토큰 컬럼 추천은 전체 컬럼", () => {
  const s = getSuggestions("", "", cols);
  expect(s.map((x) => x.text)).toEqual(expect.arrayContaining(cols));
});

test("정확히 일치하는 컬럼은 다시 추천하지 않음", () => {
  const s = getSuggestions("", "나이", cols);
  expect(s.map((x) => x.text)).not.toContain("나이");
});

test("is empty 시작 후에는 LOGIC 추천", () => {
  const s = getSuggestions("나이 is ", "", cols);
  expect(s.map((x) => x.text)).toEqual(expect.arrayContaining(["AND", "OR"]));
});

test("연산자가 없으면 두 번째 토큰 이후에도 연산자 추천", () => {
  // 따옴표 컬럼만 있고 연산자가 아직 없을 때는 OPERATOR 기대
  const s = getSuggestions('"성과 이름" ', "", cols);
  expect(s.map((x) => x.text)).toEqual(expect.arrayContaining(["=", "like"]));
});

test("LOGIC 빈 토큰이면 AND/OR 전체", () => {
  const s = getSuggestions("나이 = 30 ", "", cols);
  expect(s.map((x) => x.text)).toEqual(["AND", "OR"]);
});

test("OR 뒤에는 다시 컬럼", () => {
  const s = getSuggestions("나이 > 30 OR ", "이", cols);
  expect(s.map((x) => x.text)).toContain("이름");
});

test("결과는 최대 8개", () => {
  const many = Array.from({ length: 20 }, (_, i) => `col${i}`);
  const s = getSuggestions("", "col", many);
  expect(s.length).toBe(8);
});
