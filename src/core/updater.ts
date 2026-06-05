// 자동 업데이트: GitHub 릴리스의 서명된 업데이터 아티팩트를 확인하고 설치한다.
// Tauri 런타임이 아닌 환경(브라우저/테스트)에서는 호출 시 에러가 나므로 호출부에서 처리한다.
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";

export interface AvailableUpdate {
  version: string;
  notes?: string;
  /** 다운로드(진행률 콜백)·설치 후 앱을 재시작한다. */
  install: (onProgress?: (percent: number) => void) => Promise<void>;
}

export type UpdateCheck =
  | { kind: "available"; currentVersion: string; update: AvailableUpdate }
  | { kind: "latest"; currentVersion: string }
  | { kind: "error"; message: string };

async function currentVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return "";
  }
}

/** 업데이트 상태를 구분해 반환한다(수동 확인 버튼용). */
export async function checkUpdateStatus(): Promise<UpdateCheck> {
  try {
    const [update, cur] = await Promise.all([check({ timeout: 30_000 }), currentVersion()]);
    if (!update) {
      return { kind: "latest", currentVersion: cur };
    }
    return {
      kind: "available",
      currentVersion: cur,
      update: {
        version: update.version,
        notes: update.body,
        install: async (onProgress) => {
          let total = 0;
          let downloaded = 0;
          await update.downloadAndInstall((e) => {
            switch (e.event) {
              case "Started":
                total = e.data.contentLength ?? 0;
                onProgress?.(0);
                break;
              case "Progress":
                downloaded += e.data.chunkLength;
                onProgress?.(total > 0 ? Math.min(99, Math.round((downloaded / total) * 100)) : 0);
                break;
              case "Finished":
                onProgress?.(100);
                break;
            }
          });
          await relaunch();
        },
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { kind: "error", message };
  }
}
