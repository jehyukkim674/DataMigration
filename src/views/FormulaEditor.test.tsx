import { expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invokeMock(...a) }));

import { FormulaEditor } from "./FormulaEditor";

const samples = [{ value: "CentOs 5.3 LTS", parts: ["CentOs", "5.3", "LTS"] }];

beforeEach(() => invokeMock.mockReset());

test("유효한 수식이면 적용 가능, 결과 미리보기", () => {
  const onApply = vi.fn();
  render(<FormulaEditor initial="p0" samples={samples} onApply={onApply} onClose={vi.fn()} />);
  expect(screen.getByText("✓ 유효한 수식")).toBeTruthy();
  fireEvent.click(screen.getByText("적용"));
  expect(onApply).toHaveBeenCalledWith("p0");
});

test("잘못된 수식이면 에러 표시 + 적용 비활성", () => {
  render(<FormulaEditor initial="if(contains(" samples={samples} onApply={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByText(/✗/)).toBeTruthy();
  expect((screen.getByText("적용") as HTMLButtonElement).disabled).toBe(true);
});

test("변수/함수 칩 클릭 시 수식에 삽입", () => {
  render(<FormulaEditor initial="" samples={samples} onApply={vi.fn()} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "p1" }));
  const ta = document.querySelector("textarea") as HTMLTextAreaElement;
  expect(ta.value).toContain("p1");
});

test("AI 수식 생성 버튼", async () => {
  invokeMock.mockResolvedValue({ structuredOutput: { formula: 'if(contains(value,"LTS"),"Y","N")', explain: "설명" }, message: "", costUsd: 0 });
  render(<FormulaEditor initial="" samples={samples} onApply={vi.fn()} onClose={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText(/원하는 걸/), { target: { value: "LTS면 Y" } });
  fireEvent.click(screen.getByText("수식 생성"));
  await waitFor(() => expect(screen.getByText("설명")).toBeTruthy());
  expect(invokeMock).toHaveBeenCalledWith("ai_command", expect.any(Object));
});
