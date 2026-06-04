import { expect, test, vi, beforeEach } from "vitest";
import { ColumnStore } from "../data/ColumnStore";
import { EMPTY_VIEW } from "../view/viewState";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invokeMock(...a) }));

import {
  serializeSession, captureSnapshot, saveSession, loadSession,
  loadSnapshots, addSnapshot, restoreSnapshot,
} from "./session";

beforeEach(() => invokeMock.mockReset());

function sample() {
  return ColumnStore.fromRows([{ id: "c0", name: "a", type: "string" }], [["x"], ["y"]]);
}

test("serializeSession 직렬화", () => {
  const d = JSON.parse(serializeSession(sample(), EMPTY_VIEW, "/p/f.csv"));
  expect(d.columns).toEqual([{ id: "c0", name: "a", type: "string" }]);
  expect(d.rows).toEqual([["x"], ["y"]]);
  expect(d.source).toBe("/p/f.csv");
});

test("captureSnapshot / restoreSnapshot 왕복", () => {
  const snap = captureSnapshot(sample(), EMPTY_VIEW, "src", "라벨");
  expect(snap.label).toBe("라벨");
  const r = restoreSnapshot(snap);
  expect(r.store.getColumn("c0")?.values).toEqual(["x", "y"]);
  expect(r.source).toBe("src");
});

test("saveSession은 save_session invoke", async () => {
  invokeMock.mockResolvedValue(undefined);
  await saveSession(sample(), EMPTY_VIEW, "f");
  expect(invokeMock).toHaveBeenCalledWith("save_session", { json: expect.any(String) });
});

test("loadSession은 JSON을 store로 복원", async () => {
  invokeMock.mockResolvedValue(serializeSession(sample(), EMPTY_VIEW, "f"));
  const r = await loadSession();
  expect(r?.store.rowCount).toBe(2);
  invokeMock.mockResolvedValue(null);
  expect(await loadSession()).toBeNull();
});

test("loadSnapshots / addSnapshot", async () => {
  invokeMock.mockResolvedValue(null);
  expect(await loadSnapshots()).toEqual([]);
  invokeMock.mockResolvedValue(undefined);
  const snap = captureSnapshot(sample(), EMPTY_VIEW, "s", "L");
  const list = await addSnapshot([], snap);
  expect(list).toHaveLength(1);
  expect(invokeMock).toHaveBeenCalledWith("save_snapshots", { json: expect.any(String) });
});
