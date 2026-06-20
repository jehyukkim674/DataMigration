import { useEffect } from "react";

// 열려 있는 모달들의 닫기 콜백 스택. Esc는 가장 위(마지막에 열린) 모달만 닫는다.
const stack: Array<() => void> = [];
let listening = false;

function onKey(e: KeyboardEvent): void {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  if (e.isComposing) return; // IME 조합 취소용 Esc는 무시
  const top = stack[stack.length - 1];
  if (!top) return;
  e.preventDefault();
  e.stopPropagation();
  top();
}

/** Esc 키로 모달을 닫는 공통 훅. 모달이 겹쳐도 가장 위의 것만 닫는다. */
export function useEscClose(onClose: () => void): void {
  useEffect(() => {
    stack.push(onClose);
    if (!listening) {
      window.addEventListener("keydown", onKey, true);
      listening = true;
    }
    return () => {
      const i = stack.lastIndexOf(onClose);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [onClose]);
}
