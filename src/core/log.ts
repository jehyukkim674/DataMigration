/** 예외/오류를 일관된 형식으로 콘솔에 기록(개발자 도구에서 확인). */
export function logError(context: string, err: unknown): void {
  const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  // eslint-disable-next-line no-console
  console.error(`[DataMigration] ${context}: ${msg}`);
}

/** 처리되지 않은 Promise 거부/전역 오류도 로그로 남긴다. */
export function installGlobalErrorLogging(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("unhandledrejection", (e) => logError("unhandledRejection", e.reason));
  window.addEventListener("error", (e) => logError("windowError", e.error ?? e.message));
}
