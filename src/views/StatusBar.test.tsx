import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

test("출처/행수/열수 표시 + 줌 버튼", () => {
  const onZoom = vi.fn();
  render(<StatusBar source="/data/file.csv" visibleRows={10} totalRows={20} colCount={5} zoom={1.2} onZoom={onZoom} />);
  expect(screen.getByText(/file\.csv/)).toBeTruthy();
  expect(screen.getByText(/표시 10 \/ 전체 20/)).toBeTruthy();
  expect(screen.getByText("120%")).toBeTruthy();
  fireEvent.click(screen.getByText("120%"));
  expect(onZoom).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getByTitle("확대"));
  expect(onZoom).toHaveBeenCalledWith(1.3);
});

test("출처 없으면 '파일 없음'", () => {
  render(<StatusBar visibleRows={0} totalRows={0} colCount={0} zoom={1} onZoom={vi.fn()} />);
  expect(screen.getByText("파일 없음")).toBeTruthy();
});

test("선택 셀 위치(cellInfo) 표시", () => {
  render(<StatusBar visibleRows={5} totalRows={10} colCount={3} zoom={1} onZoom={vi.fn()} cellInfo="도시 · 12행" />);
  expect(screen.getByText(/도시 · 12행/)).toBeTruthy();
});

test("슬라이더/축소 버튼 onZoom", () => {
  const onZoom = vi.fn();
  const { container } = render(<StatusBar visibleRows={1} totalRows={1} colCount={1} zoom={1.2} onZoom={onZoom} />);
  const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
  fireEvent.change(slider, { target: { value: "1.5" } });
  expect(onZoom).toHaveBeenCalledWith(1.5);
  fireEvent.click(screen.getByTitle("축소"));
  expect(onZoom).toHaveBeenCalledWith(expect.closeTo(1.1, 5));
});
