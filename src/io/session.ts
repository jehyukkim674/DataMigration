import { invoke } from "@tauri-apps/api/core";
import { ColumnStore } from "../data/ColumnStore";
import type { CellValue, DataType } from "../data/types";
import { EMPTY_VIEW, type ViewState } from "../view/viewState";
import { logError, measure, measureAsync } from "../core/log";
import { genId } from "../core/id";

interface SessionData {
  columns: { id: string; name: string; type: DataType }[];
  rows: CellValue[][];
  view: ViewState;
  source?: string;
}

/**
 * store를 행 우선 2차원 배열로 변환.
 * 셀마다 Map을 조회하는 getCell 대신 컬럼 값 배열(rawValues)을 한 번씩만 가져와
 * 대용량·넓은 표에서 Map 조회 횟수를 (행×열)에서 (열)로 줄인다.
 */
function buildRows(store: ColumnStore): CellValue[][] {
  const cols = store.columns;
  const colArrays = cols.map((c) => store.rawValues(c.id));
  const n = store.rowCount;
  const rows: CellValue[][] = new Array(n);
  for (let r = 0; r < n; r++) {
    const row: CellValue[] = new Array(cols.length);
    for (let ci = 0; ci < cols.length; ci++) row[ci] = colArrays[ci]?.[r] ?? null;
    rows[r] = row;
  }
  return rows;
}

export function serializeSession(store: ColumnStore, view: ViewState, source?: string): string {
  return measure(`serializeSession(${store.rowCount}행)`, () => {
    const data: SessionData = {
      columns: store.columns.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      rows: buildRows(store),
      view,
      source,
    };
    return JSON.stringify(data);
  }, 80);
}

/** 현재 화면(데이터+뷰)을 앱 데이터 폴더에 저장. */
export async function saveSession(store: ColumnStore, view: ViewState, source?: string): Promise<void> {
  await measureAsync("saveSession", () =>
    invoke("save_session", { json: serializeSession(store, view, source) }),
  );
}

/** 저장된 마지막 화면을 복원(없거나 손상 시 null). */
export async function loadSession(): Promise<{ store: ColumnStore; view: ViewState; source?: string } | null> {
  const json = await measureAsync("loadSession", () => invoke<string | null>("load_session"));
  if (!json) return null;
  try {
    const d = JSON.parse(json) as SessionData;
    if (!Array.isArray(d.columns) || !Array.isArray(d.rows)) return null;
    return { store: ColumnStore.fromRows(d.columns, d.rows), view: d.view ?? EMPTY_VIEW, source: d.source };
  } catch (e) {
    logError("loadSession 파싱", e);
    return null;
  }
}

// ── 스냅샷(변경 저장점) ──

export interface SnapshotMeta {
  id: string;
  time: number;
  label: string;
}
export interface SnapshotFull extends SnapshotMeta {
  data: SessionData;
}

const MAX_SNAPSHOTS = 12;

export function captureSnapshot(store: ColumnStore, view: ViewState, source: string | undefined, label: string): SnapshotFull {
  return {
    id: genId("snap"), // 같은 ms 생성 시에도 충돌하지 않는 고유 id
    time: Date.now(),
    label,
    data: { columns: store.columns.map((c) => ({ id: c.id, name: c.name, type: c.type })), rows: buildRows(store), view, source },
  };
}

export async function loadSnapshots(): Promise<SnapshotFull[]> {
  const json = await invoke<string | null>("load_snapshots");
  if (!json) return [];
  try {
    const list = JSON.parse(json) as SnapshotFull[];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    logError("loadSnapshots 파싱", e);
    return [];
  }
}

/** 새 스냅샷을 목록 맨 앞에 추가하고 최대 개수로 자른 뒤 저장. 저장된 메타 목록 반환. */
export async function addSnapshot(list: SnapshotFull[], snap: SnapshotFull): Promise<SnapshotFull[]> {
  const next = [snap, ...list].slice(0, MAX_SNAPSHOTS);
  await invoke("save_snapshots", { json: JSON.stringify(next) });
  return next;
}

export async function deleteSnapshots(list: SnapshotFull[]): Promise<void> {
  await invoke("save_snapshots", { json: JSON.stringify(list) });
}

/** id 스냅샷 하나 삭제 후 저장. 남은 목록 반환. */
export async function removeSnapshot(list: SnapshotFull[], id: string): Promise<SnapshotFull[]> {
  const next = list.filter((s) => s.id !== id);
  await invoke("save_snapshots", { json: JSON.stringify(next) });
  return next;
}

export function restoreSnapshot(snap: SnapshotFull): { store: ColumnStore; view: ViewState; source?: string } {
  const d = snap.data;
  return { store: ColumnStore.fromRows(d.columns, d.rows), view: d.view, source: d.source };
}
