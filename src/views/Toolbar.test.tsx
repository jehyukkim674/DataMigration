import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./Toolbar";

function props() {
  return {
    onImport: vi.fn(), onExport: vi.fn(), onSave: vi.fn(), onSnapshot: vi.fn(), onJoin: vi.fn(),
    onUndo: vi.fn(), onRedo: vi.fn(), canUndo: true, canRedo: false,
    onMerge: vi.fn(), onSplit: vi.fn(), onReplace: vi.fn(), onNewColumn: vi.fn(),
    onColumnSettings: vi.fn(), onCheckUpdate: vi.fn(),
    headerLabel: "alias" as const, onHeaderLabel: vi.fn(),
    showMinimap: true, onToggleMinimap: vi.fn(),
    showAiPanel: true, onToggleAiPanel: vi.fn(),
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

test("표기/미니맵/AI 체크박스 토글", () => {
  const p = props();
  render(<Toolbar {...p} />);
  fireEvent.click(screen.getByText("원래이름").querySelector("input")!); // alias+name → both
  expect(p.onHeaderLabel).toHaveBeenCalledWith("both");
  fireEvent.click(screen.getByText("미니맵").querySelector("input")!);
  expect(p.onToggleMinimap).toHaveBeenCalledWith(false);
  fireEvent.click(screen.getByText("AI").querySelector("input")!);
  expect(p.onToggleAiPanel).toHaveBeenCalledWith(false);
});
