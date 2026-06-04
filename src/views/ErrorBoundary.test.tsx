import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("터졌어요");
}

test("자식이 throw하면 복구 UI 표시 + 다시 시도", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  function Wrapper({ crash }: { crash: boolean }) {
    return <ErrorBoundary>{crash ? <Boom /> : <div>정상</div>}</ErrorBoundary>;
  }
  const { rerender } = render(<Wrapper crash />);
  expect(screen.getByText(/문제가 발생/)).toBeTruthy();
  expect(screen.getByText("터졌어요")).toBeTruthy();
  rerender(<Wrapper crash={false} />);
  fireEvent.click(screen.getByText("다시 시도"));
  expect(screen.getByText("정상")).toBeTruthy();
});

test("정상 자식은 그대로 렌더", () => {
  render(<ErrorBoundary><span>OK</span></ErrorBoundary>);
  expect(screen.getByText("OK")).toBeTruthy();
});
