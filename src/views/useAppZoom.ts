import { useCallback, useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

const KEY = "appZoom";
const MIN = 0.5;
const MAX = 2.0;
const STEP = 0.1;

function clamp(z: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(z * 10) / 10));
}

/**
 * 앱 전체 확대/축소. CSS `zoom` 대신 Tauri 웹뷰 줌(엔진 레벨)을 사용한다 —
 * CSS zoom은 캔버스 그리드의 마우스 좌표 계산을 깨뜨려 클릭/선택 위치가 어긋나기 때문.
 * Cmd +/-/0 단축키 + 값 저장. 반환 setZoom으로 하단 슬라이더에서도 조절.
 */
export function useAppZoom(): { zoom: number; setZoom: (z: number) => void } {
  const [zoom, setZoomState] = useState<number>(() => {
    const saved = Number(localStorage.getItem(KEY));
    return saved >= MIN && saved <= MAX ? saved : 1;
  });

  const setZoom = useCallback((z: number) => setZoomState(clamp(z)), []);

  useEffect(() => {
    localStorage.setItem(KEY, String(zoom));
    getCurrentWebview()
      .setZoom(zoom)
      .catch(() => {
        /* 브라우저/비-Tauri 환경에서는 무시 */
      });
  }, [zoom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoomState((z) => clamp(z + STEP));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoomState((z) => clamp(z - STEP));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoomState(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { zoom, setZoom };
}
