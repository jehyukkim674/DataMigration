import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SnapshotNameDialog } from "./SnapshotNameDialog";
import { SnapshotDrawer } from "./SnapshotDrawer";
import type { SnapshotFull } from "../io/session";

test("SnapshotNameDialog: 입력 후 저장", () => {
  const onSave = vi.fn();
  render(<SnapshotNameDialog defaultName="스냅샷 10:00" onSave={onSave} onClose={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText("스냅샷 이름"), { target: { value: "정리 전" } });
  fireEvent.click(screen.getByText("저장"));
  expect(onSave).toHaveBeenCalledWith("정리 전");
});

test("SnapshotNameDialog: 비우면 기본 이름", () => {
  const onSave = vi.fn();
  render(<SnapshotNameDialog defaultName="기본명" onSave={onSave} onClose={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText("스냅샷 이름"), { target: { value: "  " } });
  fireEvent.click(screen.getByText("저장"));
  expect(onSave).toHaveBeenCalledWith("기본명");
});

const snaps = [
  { id: "s1", label: "스냅샷 A", time: 1, data: {} },
  { id: "s2", label: "스냅샷 B", time: 2, data: {} },
] as unknown as SnapshotFull[];

test("SnapshotDrawer: 목록 + 새 스냅샷/복원/삭제", () => {
  const onNew = vi.fn();
  const onRestore = vi.fn();
  const onDelete = vi.fn();
  render(<SnapshotDrawer snapshots={snaps} onNew={onNew} onCompare={vi.fn()} onRestore={onRestore} onDelete={onDelete} onClose={vi.fn()} />);
  expect(screen.getByText("스냅샷 A")).toBeTruthy();
  fireEvent.click(screen.getByText(/새 스냅샷/));
  expect(onNew).toHaveBeenCalled();
  fireEvent.click(screen.getAllByText("복원")[1]);
  expect(onRestore).toHaveBeenCalledWith(snaps[1]);
  fireEvent.click(screen.getAllByTitle("삭제")[0]);
  expect(onDelete).toHaveBeenCalledWith(snaps[0]);
});

test("SnapshotDrawer: 비어있으면 안내", () => {
  render(<SnapshotDrawer snapshots={[]} onNew={vi.fn()} onCompare={vi.fn()} onRestore={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByText(/저장된 스냅샷이 없습니다/)).toBeTruthy();
});
