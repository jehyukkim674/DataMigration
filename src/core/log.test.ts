import { expect, test, vi } from "vitest";
import { measure, measureAsync } from "./log";

test("measure는 결과를 그대로 반환", () => {
  expect(measure("x", () => 42)).toBe(42);
});

test("measure는 임계값 초과 시 콘솔 경고", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  measure("slow", () => { const t = performance.now(); while (performance.now() - t < 4) { /* busy */ } }, 1);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

test("measure는 빠르면 경고 안 함", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  measure("fast", () => 1, 1000);
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

test("measureAsync는 결과 반환", async () => {
  expect(await measureAsync("a", async () => "ok")).toBe("ok");
});
