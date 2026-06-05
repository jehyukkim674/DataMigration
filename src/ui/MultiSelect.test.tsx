import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MultiSelect } from "./MultiSelect";

const opts = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Banana" },
  { value: "c", label: "Cherry" },
];

test("선택 요약 표시", () => {
  render(<MultiSelect values={["a", "b"]} options={opts} onChange={() => {}} />);
  expect(screen.getByText("Apple, Banana")).toBeTruthy();
});

test("전체 선택은 모든 값 전달", () => {
  const onChange = vi.fn();
  render(<MultiSelect values={[]} options={opts} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(screen.getByText("전체 선택"));
  expect(onChange).toHaveBeenCalledWith(["a", "b", "c"]);
});

test("개별 토글은 옵션 순서 유지", () => {
  const onChange = vi.fn();
  render(<MultiSelect values={["c"]} options={opts} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(screen.getByText("Apple"));
  expect(onChange).toHaveBeenCalledWith(["a", "c"]);
});

test("전체 해제", () => {
  const onChange = vi.fn();
  render(<MultiSelect values={["a", "b"]} options={opts} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(screen.getByText("전체 해제"));
  expect(onChange).toHaveBeenCalledWith([]);
});
