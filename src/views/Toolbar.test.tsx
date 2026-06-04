import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./Toolbar";

function props() {
  return {
    onImport: vi.fn(), onExport: vi.fn(), onSave: vi.fn(), onSnapshot: vi.fn(), onJoin: vi.fn(),
    onUndo: vi.fn(), onRedo: vi.fn(), canUndo: true, canRedo: false,
    onMerge: vi.fn(), onSplit: vi.fn(), onReplace: vi.fn(), onNewColumn: vi.fn(),
    onColumnSettings: vi.fn(), onCheckUpdate: vi.fn(),
  };
}

test("주요 버튼 클릭 시 콜백 호출", () => {
  const p = props();
  render(<Toolbar {...p} />);
  fireEvent.click(screen.getByText("가져오기"));
  fireEvent.click(screen.getByText("찾기/바꾸기"));
  fireEvent.click(screen.getByText("컬럼 설정"));
  expect(p.onImport).toHaveBeenCalled();
  expect(p.onReplace).toHaveBeenCalled();
  expect(p.onColumnSettings).toHaveBeenCalled();
});

test("canUndo/canRedo로 버튼 비활성", () => {
  const p = props();
  render(<Toolbar {...p} />);
  expect((screen.getByText("↷ 다시실행") as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByText("↶ 되돌리기") as HTMLButtonElement).disabled).toBe(false);
});
