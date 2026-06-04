import { expect, test } from "vitest";
import { columnDataToStore } from "./importFile";

test("columnDataToStore는 Rust 응답을 ColumnStore로 변환한다", () => {
  const store = columnDataToStore({
    columns: [
      { id: "col0", name: "name", dataType: "string" },
      { id: "col1", name: "age", dataType: "number" },
    ],
    rows: [
      ["Kim", 30],
      ["Lee", 25],
    ],
  });
  expect(store.rowCount).toBe(2);
  expect(store.getCell(0, "col0")).toBe("Kim");
  expect(store.getColumn("col1")?.type).toBe("number");
});
