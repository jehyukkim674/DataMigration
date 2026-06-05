import { expect, test } from "vitest";
import { computeSourceInfo } from "./sourceInfo";

test("출처 없으면 hasSource=false", () => {
  const s = computeSourceInfo(undefined);
  expect(s.hasSource).toBe(false);
  expect(s.legend).toEqual([]);
});

test("distinct 출처를 A/B로 매핑 + 범례", () => {
  const s = computeSourceInfo({ j0: "a.csv", j1: "a.csv", j2: "b.csv" });
  expect(s.letterOf).toEqual({ j0: "A", j1: "A", j2: "B" });
  expect(s.colorOf.j0).toBe(s.colorOf.j1);
  expect(s.colorOf.j0).not.toBe(s.colorOf.j2);
  expect(s.legend).toEqual([
    { letter: "A", name: "a.csv", color: s.colorOf.j0 },
    { letter: "B", name: "b.csv", color: s.colorOf.j2 },
  ]);
  expect(s.hasSource).toBe(true);
});
