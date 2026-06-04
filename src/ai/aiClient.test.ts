import { expect, test } from "vitest";
import { ColumnStore } from "../data/ColumnStore";
import { buildPrompt } from "./aiClient";

test("buildPrompt는 컬럼/샘플/요청을 포함한다", () => {
  const store = ColumnStore.fromRows(
    [{ id: "c0", name: "이름", type: "string" }, { id: "c1", name: "나이", type: "number" }],
    [["Kim", 30], ["Lee", 25]],
  );
  const p = buildPrompt(store, "나이 30 이상만 보여줘");
  expect(p).toContain("이름");
  expect(p).toContain("나이");
  expect(p).toContain("나이 30 이상만 보여줘");
  expect(p).toContain("Kim");
});
