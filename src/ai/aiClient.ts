import { invoke } from "@tauri-apps/api/core";
import type { ColumnStore } from "../data/ColumnStore";
import { COMMAND_SCHEMA, type AiResult } from "./commandSchema";

const SAMPLE_ROWS = 5;

export function buildPrompt(store: ColumnStore, request: string): string {
  const cols = store.columns.map((c) => `${c.name}(${c.type})`).join(", ");
  const lines: string[] = [];
  const n = Math.min(SAMPLE_ROWS, store.rowCount);
  for (let r = 0; r < n; r++) {
    lines.push(store.columns.map((c) => String(store.getCell(r, c.id) ?? "")).join(" | "));
  }
  return [
    "너는 표 데이터 편집 도우미다. 아래 데이터에 대한 사용자 요청을 commands 배열로 변환하라.",
    "컬럼은 반드시 아래 정확한 이름으로 지정. 불명확하면 commands를 비우고 reply로 되물어라.",
    "필터/정렬/숨김은 보기만 바꾸는 뷰 명령(filter/sort/hideColumn/clearView).",
    "편집/합치기/쪼개기/컬럼생성/삭제/이름변경은 데이터 변환 명령이다.",
    "한 컬럼을 여러 의미로 나눌 땐 splitColumnMap을 써라: separator로 나눈 뒤 splitParts에 {index,name}으로 원하는 조각만 새 컬럼으로 만든다(빠진 조각은 제외).",
    '예: "CentOs 5.3 LTS" → action=splitColumnMap, columnName=OS, separator=" ", splitParts=[{index:0,name:"os명"},{index:1,name:"os버전"}] (index 2 LTS 제외).',
    "",
    `컬럼: ${cols}`,
    `샘플(최대 ${SAMPLE_ROWS}행):`,
    ...lines,
    "",
    `사용자 요청: ${request}`,
  ].join("\n");
}

export interface AiRawResponse {
  structuredOutput: unknown;
  message: string;
  costUsd: number;
}

/** Rust ai_command 호출 → 구조화 결과. claude CLI 미발견 등은 throw. */
export async function runAi(
  store: ColumnStore,
  request: string,
  opts?: { model?: string; claudePath?: string },
): Promise<{ result: AiResult; message: string; costUsd: number }> {
  const prompt = buildPrompt(store, request);
  const raw = await invoke<AiRawResponse>("ai_command", {
    prompt,
    schema: COMMAND_SCHEMA,
    model: opts?.model,
    claudePath: opts?.claudePath,
  });
  const result = (raw.structuredOutput ?? { commands: [] }) as AiResult;
  if (!Array.isArray(result.commands)) result.commands = [];
  return { result, message: raw.message, costUsd: raw.costUsd };
}
