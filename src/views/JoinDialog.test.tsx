import { expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ColumnStore } from "../data/ColumnStore";

const importMock = vi.fn();
vi.mock("../io/importFile", () => ({ importFileDialog: () => importMock() }));

import { JoinDialog } from "./JoinDialog";

const a = ColumnStore.fromRows(
  [{ id: "c0", name: "id", type: "string" }, { id: "c1", name: "이름", type: "string" }],
  [["1", "Kim"], ["2", "Lee"]],
);
const b = ColumnStore.fromRows(
  [{ id: "c0", name: "id", type: "string" }, { id: "c1", name: "도시", type: "string" }],
  [["1", "서울"], ["2", "부산"]],
);

beforeEach(() => importMock.mockReset());

test("두 파일 조인 → onApply 호출", async () => {
  const onApply = vi.fn();
  render(<JoinDialog current={{ store: a, name: "A.csv" }} onApply={onApply} onClose={vi.fn()} />);
  // 파일 B 선택
  importMock.mockResolvedValue({ store: b, path: "/B.csv" });
  fireEvent.click(screen.getAllByText("파일 선택")[1]); // 파일 B 슬롯
  await waitFor(() => expect(screen.getByText(/B\.csv/)).toBeTruthy());
  fireEvent.click(screen.getByText("조인 실행"));
  expect(onApply).toHaveBeenCalled();
  const [joined] = onApply.mock.calls[0];
  expect(joined.rowCount).toBe(2);
});

test("파일 미선택 시 에러", () => {
  render(<JoinDialog onApply={vi.fn()} onClose={vi.fn()} />);
  // A,B 둘 다 없음 → 조인 실행 비활성
  expect((screen.getByText("조인 실행") as HTMLButtonElement).disabled).toBe(true);
});
