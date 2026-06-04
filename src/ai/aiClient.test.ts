import { expect, test, vi, beforeEach } from "vitest";
import { ColumnStore } from "../data/ColumnStore";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invokeMock(...a) }));

import { buildPrompt, runAi, generateFormula } from "./aiClient";

beforeEach(() => invokeMock.mockReset());

function store() {
  return ColumnStore.fromRows(
    [{ id: "c0", name: "이름", type: "string" }, { id: "c1", name: "나이", type: "number" }],
    [["Kim", 30], ["Lee", 25]],
  );
}

test("buildPrompt는 컬럼/샘플/요청을 포함한다", () => {
  const p = buildPrompt(store(), "나이 30 이상만 보여줘");
  expect(p).toContain("이름");
  expect(p).toContain("나이");
  expect(p).toContain("나이 30 이상만 보여줘");
  expect(p).toContain("Kim");
});

test("runAi는 ai_command 호출하고 commands를 매핑", async () => {
  invokeMock.mockResolvedValue({ structuredOutput: { commands: [{ action: "filter" }], reply: "ok" }, message: "msg", costUsd: 0.01 });
  const { result, message, costUsd } = await runAi(store(), "필터");
  expect(invokeMock).toHaveBeenCalledWith("ai_command", expect.objectContaining({ schema: expect.any(String), prompt: expect.any(String) }));
  expect(result.commands).toHaveLength(1);
  expect(message).toBe("msg");
  expect(costUsd).toBe(0.01);
});

test("runAi는 structuredOutput 없으면 빈 commands", async () => {
  invokeMock.mockResolvedValue({ structuredOutput: null, message: "", costUsd: 0 });
  const { result } = await runAi(store(), "x");
  expect(result.commands).toEqual([]);
});

test("generateFormula는 formula를 반환", async () => {
  invokeMock.mockResolvedValue({ structuredOutput: { formula: "p0", explain: "설명" }, message: "", costUsd: 0 });
  const r = await generateFormula("첫 조각", [{ value: "a b", parts: ["a", "b"] }]);
  expect(r.formula).toBe("p0");
  expect(r.explain).toBe("설명");
});
