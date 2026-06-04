import { vi, test, expect, beforeEach } from "vitest";

const setZoom = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/api/webview", () => ({ getCurrentWebview: () => ({ setZoom }) }));

import { renderHook, act } from "@testing-library/react";
import { useAppZoom } from "./useAppZoom";

beforeEach(() => {
  const mem: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
    clear: () => { for (const k in mem) delete mem[k]; },
  });
  setZoom.mockClear();
});

test("초기값 1, setZoom으로 변경 + 웹뷰 setZoom 호출", () => {
  const { result } = renderHook(() => useAppZoom());
  expect(result.current.zoom).toBe(1);
  act(() => result.current.setZoom(1.5));
  expect(result.current.zoom).toBe(1.5);
  expect(setZoom).toHaveBeenCalledWith(1.5);
});

test("범위를 벗어나면 clamp", () => {
  const { result } = renderHook(() => useAppZoom());
  act(() => result.current.setZoom(5));
  expect(result.current.zoom).toBe(2);
  act(() => result.current.setZoom(0.1));
  expect(result.current.zoom).toBe(0.5);
});

test("Cmd +/-/0 단축키", () => {
  const { result } = renderHook(() => useAppZoom());
  act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "=", metaKey: true })));
  expect(result.current.zoom).toBeGreaterThan(1);
  act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "0", metaKey: true })));
  expect(result.current.zoom).toBe(1);
});
