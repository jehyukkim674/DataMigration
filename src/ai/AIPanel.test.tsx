import { expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ColumnStore } from "../data/ColumnStore";
import { EMPTY_VIEW } from "../view/viewState";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invokeMock(...a) }));

import { AIPanel } from "./AIPanel";

const store = ColumnStore.fromRows(
  [{ id: "c0", name: "이름", type: "string" }, { id: "c1", name: "나이", type: "number" }],
  [["Kim", 30], ["Lee", 25]],
);

beforeEach(() => invokeMock.mockReset());

test("요청 보내면 AI 응답 + 적용 대기", async () => {
  invokeMock.mockResolvedValue({
    structuredOutput: { commands: [{ action: "filter", columnName: "나이", op: ">", value: "27" }], reply: "필터합니다" },
    message: "", costUsd: 0,
  });
  const onApplyView = vi.fn();
  render(<AIPanel store={store} view={EMPTY_VIEW} onApplyOps={vi.fn()} onApplyView={onApplyView} />);
  fireEvent.change(screen.getByPlaceholderText("자연어로 요청…"), { target: { value: "나이 27 초과" } });
  fireEvent.click(screen.getByText("보내기"));
  await waitFor(() => expect(screen.getByText(/필터합니다/)).toBeTruthy());
  fireEvent.click(screen.getByText("적용"));
  expect(onApplyView).toHaveBeenCalled();
});

test("데이터 없으면 먼저 가져오라고 안내", () => {
  const empty = ColumnStore.fromRows([], []);
  render(<AIPanel store={empty} view={EMPTY_VIEW} onApplyOps={vi.fn()} onApplyView={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText("자연어로 요청…"), { target: { value: "x" } });
  fireEvent.click(screen.getByText("보내기"));
  expect(screen.getByText("먼저 데이터를 가져오세요.")).toBeTruthy();
});
