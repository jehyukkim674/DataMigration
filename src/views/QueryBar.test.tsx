import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryBar } from "./QueryBar";

test("적용 버튼은 onApply 호출", () => {
  const onApply = vi.fn();
  render(<QueryBar initial="" columns={["나이", "도시"]} onApply={onApply} />);
  const input = screen.getByPlaceholderText(/예:/);
  fireEvent.change(input, { target: { value: '나이 > 30' } });
  fireEvent.click(screen.getByText("적용"));
  expect(onApply).toHaveBeenCalledWith("나이 > 30");
});

test("초기화는 빈 쿼리로 onApply", () => {
  const onApply = vi.fn();
  render(<QueryBar initial='도시 = "서울"' columns={["도시"]} onApply={onApply} />);
  fireEvent.click(screen.getByText("초기화"));
  expect(onApply).toHaveBeenCalledWith("");
});

test("에러 메시지 표시", () => {
  render(<QueryBar initial="x" columns={["도시"]} error="알 수 없는 컬럼" onApply={vi.fn()} />);
  expect(screen.getByText("알 수 없는 컬럼")).toBeTruthy();
});

test("자동완성 추천 클릭 시 삽입", () => {
  render(<QueryBar initial="" columns={["나이", "도시"]} onApply={vi.fn()} />);
  const input = screen.getByPlaceholderText(/예:/) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "나" } });
  fireEvent.mouseDown(screen.getByText("나이"));
  expect(input.value).toContain("나이");
});

test("모두 지우고 Enter는 빈 쿼리 적용(추천 미선택)", () => {
  const onApply = vi.fn();
  render(<QueryBar initial='도시 = "서울"' columns={["나이", "도시"]} onApply={onApply} />);
  const input = screen.getByPlaceholderText(/예:/);
  fireEvent.change(input, { target: { value: "" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onApply).toHaveBeenCalledWith("");
});

test("Escape로 추천 닫기", () => {
  render(<QueryBar initial="" columns={["나이"]} onApply={vi.fn()} />);
  const input = screen.getByPlaceholderText(/예:/);
  fireEvent.change(input, { target: { value: "나" } });
  fireEvent.keyDown(input, { key: "Escape" });
  fireEvent.keyDown(input, { key: "Enter" });
});

test("스마트 따옴표는 일반 따옴표로 정규화", () => {
  const onApply = vi.fn();
  render(<QueryBar initial="" columns={["도시"]} onApply={onApply} />);
  const input = screen.getByPlaceholderText(/예:/) as HTMLInputElement;
  fireEvent.change(input, { target: { value: '도시 = “서울”' } });
  expect(input.value).toBe('도시 = "서울"');
});
