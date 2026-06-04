import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColumnStore } from "../data/ColumnStore";
import { ColumnVisibility } from "./ColumnVisibility";
import { LoadingOverlay } from "./LoadingOverlay";
import { RowDeleteConfirm } from "../grid/RowDeleteConfirm";
import { CompareDialog } from "./CompareDialog";

const store = ColumnStore.fromRows(
  [{ id: "c0", name: "이름", type: "string" }, { id: "c1", name: "도시", type: "string" }],
  [["Kim", "서울"], ["Lee", "부산"], ["Park", "대구"]],
);

test("ColumnVisibility: 숨긴 컬럼 토글", () => {
  const onToggle = vi.fn();
  render(<ColumnVisibility store={store} hidden={["c1"]} onToggle={onToggle} />);
  fireEvent.click(screen.getByText(/도시/));
  expect(onToggle).toHaveBeenCalledWith("c1");
});

test("ColumnVisibility: 숨김 없으면 null", () => {
  const { container } = render(<ColumnVisibility store={store} hidden={[]} onToggle={vi.fn()} />);
  expect(container.textContent).toBe("");
});

test("LoadingOverlay: 메시지 표시", () => {
  render(<LoadingOverlay message="불러오는 중…" />);
  expect(screen.getByText("불러오는 중…")).toBeTruthy();
});

test("RowDeleteConfirm: 목록 + 확인/취소", () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<RowDeleteConfirm store={store} columns={store.columns} rows={[0, 2]} onConfirm={onConfirm} onCancel={onCancel} />);
  fireEvent.click(screen.getByRole("button", { name: /개 행 삭제/ }));
  expect(onConfirm).toHaveBeenCalled();
  fireEvent.click(screen.getByText("취소"));
  expect(onCancel).toHaveBeenCalled();
});

test("CompareDialog: 변경 요약 표시", () => {
  const snap = ColumnStore.fromRows(
    [{ id: "c0", name: "이름", type: "string" }, { id: "c1", name: "도시", type: "string" }],
    [["Kim", "서울"], ["Lee", "울산"]],
  );
  render(<CompareDialog current={store} snapshot={snap} label="스냅A" onClose={vi.fn()} />);
  expect(screen.getByText(/스냅A/)).toBeTruthy();
  expect(screen.getByText(/추가 1행/)).toBeTruthy(); // Park 추가
});
