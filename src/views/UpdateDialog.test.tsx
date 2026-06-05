import { expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const checkMock = vi.fn();
vi.mock("../core/updater", () => ({ checkUpdateStatus: () => checkMock() }));

import { UpdateDialog } from "./UpdateDialog";

beforeEach(() => checkMock.mockReset());

test("최신 버전이면 안내", async () => {
  checkMock.mockResolvedValue({ kind: "latest", currentVersion: "0.1.9" });
  render(<UpdateDialog onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByText(/이미 최신 버전/)).toBeTruthy());
});

test("오류 시 메시지", async () => {
  checkMock.mockResolvedValue({ kind: "error", message: "network" });
  render(<UpdateDialog onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByText(/network/)).toBeTruthy());
});

test("업데이트 있으면 버전 표시 + 지금 업데이트 시 진행바", async () => {
  const install = vi.fn((cb?: (n: number) => void) => { cb?.(42); return new Promise<void>(() => {}); });
  checkMock.mockResolvedValue({ kind: "available", currentVersion: "0.1.8", update: { version: "0.1.9", notes: "릴리스 노트", install } });
  render(<UpdateDialog onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByText("v0.1.9")).toBeTruthy());
  expect(screen.getByText(/릴리스 노트/)).toBeTruthy();
  fireEvent.click(screen.getByText("지금 업데이트"));
  await waitFor(() => expect(screen.getByText(/다운로드 중/)).toBeTruthy());
  expect(install).toHaveBeenCalled();
});

test("나중에 버튼은 onClose", async () => {
  const onClose = vi.fn();
  checkMock.mockResolvedValue({ kind: "available", currentVersion: "0.1.8", update: { version: "0.1.9", install: vi.fn() } });
  render(<UpdateDialog onClose={onClose} />);
  await waitFor(() => expect(screen.getByText("나중에")).toBeTruthy());
  fireEvent.click(screen.getByText("나중에"));
  expect(onClose).toHaveBeenCalled();
});
