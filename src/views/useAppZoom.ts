import { useEffect, useState } from "react";

const KEY = "appZoom";
const MIN = 0.6;
const MAX = 2.0;
const STEP = 0.1;

function clamp(z: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(z * 10) / 10));
}

/** 앱 전체 확대/축소(Cmd +/-/0). 값은 localStorage에 저장. 반환 zoom을 컨테이너 CSS `zoom`에 적용. */
export function useAppZoom(): number {
  const [zoom, setZoom] = useState<number>(() => {
    const saved = Number(localStorage.getItem(KEY));
    return saved >= MIN && saved <= MAX ? saved : 1;
  });

  useEffect(() => {
    localStorage.setItem(KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((z) => clamp(z + STEP));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => clamp(z - STEP));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return zoom;
}
