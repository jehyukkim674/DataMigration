import { vi, test, expect, beforeEach } from "vitest";

const checkMock = vi.fn();
const relaunchMock = vi.fn();
vi.mock("@tauri-apps/plugin-updater", () => ({ check: (...a: unknown[]) => checkMock(...a) }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => relaunchMock() }));

import { checkUpdateStatus } from "./updater";

beforeEach(() => { checkMock.mockReset(); relaunchMock.mockReset(); });

test("업데이트 없으면 latest", async () => {
  checkMock.mockResolvedValue(null);
  expect((await checkUpdateStatus()).kind).toBe("latest");
});

test("업데이트 있으면 available + install 동작", async () => {
  const dl = vi.fn().mockResolvedValue(undefined);
  checkMock.mockResolvedValue({ version: "1.2.0", body: "노트", downloadAndInstall: dl });
  const r = await checkUpdateStatus();
  expect(r.kind).toBe("available");
  if (r.kind === "available") {
    expect(r.update.version).toBe("1.2.0");
    await r.update.install();
    expect(dl).toHaveBeenCalled();
    expect(relaunchMock).toHaveBeenCalled();
  }
});

test("오류 시 error", async () => {
  checkMock.mockRejectedValue(new Error("network"));
  const r = await checkUpdateStatus();
  expect(r.kind).toBe("error");
  if (r.kind === "error") expect(r.message).toContain("network");
});
