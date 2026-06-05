/** 예외/오류를 일관된 형식으로 콘솔에 기록(개발자 도구에서 확인). */
export function logError(context: string, err: unknown): void {
  const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  // eslint-disable-next-line no-console
  console.error(`[DataMigration] ${context}: ${msg}`);
}

/**
 * 동기 작업 실행 시간을 측정해, 임계값(기본 50ms)을 넘으면 콘솔에 경고.
 * "걸릴 만한" 작업을 개발자 도구에서 바로 확인할 수 있게 한다.
 */
export function measure<T>(label: string, fn: () => T, thresholdMs = 50): T {
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    const dt = performance.now() - t0;
    if (dt >= thresholdMs) {
      // eslint-disable-next-line no-console
      console.warn(`[DataMigration][perf] ${label}: ${dt.toFixed(1)}ms (느림)`);
    }
  }
}

/** 비동기 작업 시간 측정(임계값 초과 시 경고). */
export async function measureAsync<T>(label: string, fn: () => Promise<T>, thresholdMs = 200): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    const dt = performance.now() - t0;
    if (dt >= thresholdMs) {
      // eslint-disable-next-line no-console
      console.warn(`[DataMigration][perf] ${label}: ${dt.toFixed(1)}ms (느림)`);
    }
  }
}

/** 처리되지 않은 Promise 거부/전역 오류도 로그로 남긴다. */
export function installGlobalErrorLogging(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("unhandledrejection", (e) => logError("unhandledRejection", e.reason));
  window.addEventListener("error", (e) => logError("windowError", e.error ?? e.message));
}
