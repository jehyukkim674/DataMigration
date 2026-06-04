import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select } from "./Select";

const opts = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Banana" },
  { value: "c", label: "Cherry" },
];

test("현재 선택 라벨 표시", () => {
  render(<Select value="b" options={opts} onChange={() => {}} />);
  expect(screen.getByText("Banana")).toBeTruthy();
});

test("클릭하면 열리고 옵션 선택 시 onChange", () => {
  const onChange = vi.fn();
  render(<Select value="a" options={opts} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button"));
  fireEvent.mouseDown(screen.getByText("Cherry"));
  expect(onChange).toHaveBeenCalledWith("c");
});

test("키보드 ArrowDown + Enter로 선택", () => {
  const onChange = vi.fn();
  render(<Select value="a" options={opts} onChange={onChange} searchable />);
  fireEvent.click(screen.getByRole("button"));
  const search = screen.getByPlaceholderText("검색…");
  fireEvent.keyDown(search, { key: "ArrowDown" });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(onChange).toHaveBeenCalled();
});

test("검색으로 옵션 필터", () => {
  render(<Select value="c" options={opts} onChange={() => {}} searchable />);
  fireEvent.click(screen.getByRole("button")); // 트리거는 선택값 'Cherry' 표시
  fireEvent.change(screen.getByPlaceholderText("검색…"), { target: { value: "ban" } });
  expect(screen.queryByText("Apple")).toBeNull(); // 옵션 목록에서 사라짐
  expect(screen.getByText("Banana")).toBeTruthy();
});
