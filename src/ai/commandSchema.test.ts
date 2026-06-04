import { expect, test } from "vitest";
import { COMMAND_SCHEMA, type AiCommand } from "./commandSchema";

test("스키마는 유효한 JSON이고 commands 배열을 요구한다", () => {
  const parsed = JSON.parse(COMMAND_SCHEMA);
  expect(parsed.type).toBe("object");
  expect(parsed.required).toContain("commands");
});

test("AiCommand 타입은 action을 가진다(컴파일 확인)", () => {
  const c: AiCommand = { action: "filter", columnName: "나이", op: ">", value: "30" };
  expect(c.action).toBe("filter");
});
