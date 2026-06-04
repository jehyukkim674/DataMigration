// 자동 업데이트: GitHub 릴리스의 서명된 업데이터 아티팩트를 확인하고 설치한다.
// Tauri 런타임이 아닌 환경(브라우저/테스트)에서는 호출 시 에러가 나므로 호출부에서 처리한다.
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface AvailableUpdate {
  version: string;
  notes?: string;
  /** 다운로드·설치 후 앱을 재시작한다. */
  install: () => Promise<void>;
}

export type UpdateCheck =
  | { kind: "available"; update: AvailableUpdate }
  | { kind: "latest" }
  | { kind: "error"; message: string };

/** 업데이트 상태를 구분해 반환한다(수동 확인 버튼용). */
export async function checkUpdateStatus(): Promise<UpdateCheck> {
  try {
    const update = await check({ timeout: 30_000 });
    if (!update) {
      return { kind: "latest" };
    }
    return {
      kind: "available",
      update: {
        version: update.version,
        notes: update.body,
        install: async () => {
          await update.downloadAndInstall();
          await relaunch();
        },
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { kind: "error", message };
  }
}
