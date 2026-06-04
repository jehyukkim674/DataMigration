# DataMigration M1 (기반) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 없이도 동작하는 데스크톱 데이터 편집기 — Excel/CSV import, 엑셀식 가상화 그리드 편집, 합치기/쪼개기/컬럼 생성, Undo/Redo, Excel/CSV export.

**Architecture:** Tauri 2(Rust) 백엔드는 파일 파싱/내보내기만 담당하고, 작업 데이터는 프론트엔드(React/TS)의 컬럼형 ColumnStore(typed arrays)에 보관한다. 모든 변경은 단일 `Operation` 경로를 거치며, 적용 시 역연산을 만들어 Undo/Redo 스택에 쌓는다. 그리드는 glide-data-grid로 가상화 렌더링한다.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite, vitest, glide-data-grid, react-resizable-panels, Rust(`calamine` Excel 파싱, `csv` 파서, `rust_xlsxwriter` export).

이 계획은 M1만 다룬다. AI 연동은 M2, 자동 업데이터/릴리스는 M3에서 별도 계획으로 작성한다.

---

## File Structure

```
src-tauri/
  src/lib.rs            # Tauri 앱 진입, import/export 커맨드 등록
  src/import.rs         # Excel(calamine)/CSV 파싱 → ColumnData
  src/export.rs         # ColumnData → Excel(rust_xlsxwriter)/CSV
  Cargo.toml
src/
  data/types.ts         # DataType, CellValue, Column, ColumnData(직렬화 형태)
  data/ColumnStore.ts   # 컬럼형 저장소 + 행/셀 접근 + 인덱스 벡터
  ops/operations.ts     # Operation 타입 정의
  ops/applyOperation.ts # op 적용 + inverse 생성
  ops/transforms.ts     # 화이트리스트 컬럼 변환 함수(split/concat 등)
  ops/history.ts        # History (undo/redo 스택)
  io/importFile.ts      # Tauri import 커맨드 호출 → ColumnStore
  io/exportFile.ts      # ColumnStore → Tauri export 커맨드 호출
  grid/DataGrid.tsx     # glide-data-grid 가상화 편집 그리드
  views/RootView.tsx    # 패널 레이아웃 + 상태 보유
  views/Toolbar.tsx     # import/export/undo/redo/컬럼 작업 버튼
  App.tsx
```

---

## Task 1: Tauri + React + TS 스캐폴드

**Files:**
- Create: 전체 프로젝트 골격 (`src-tauri/`, `src/`, `package.json`, `vite.config.ts` 등)

- [ ] **Step 1: 임시 디렉토리에 Tauri 앱 스캐폴드**

현재 프로젝트 루트(`docs/`, `.git/` 존재)는 비어있지 않아 create-tauri-app이 거부하므로 임시 디렉토리에 만든 뒤 복사한다.

```bash
cd /tmp && rm -rf dm-scaffold
npm create tauri-app@latest dm-scaffold -- --template react-ts --manager npm --yes
```

Expected: `/tmp/dm-scaffold`에 `src/`, `src-tauri/`, `package.json`, `vite.config.ts`, `index.html` 생성.

- [ ] **Step 2: 스캐폴드 내용을 프로젝트 루트로 복사 (.git 제외)**

```bash
cd /tmp/dm-scaffold
rsync -a --exclude='.git' --exclude='node_modules' ./ /Users/82312411gimjaehyeog/Dev/DataMigration/
cd /Users/82312411gimjaehyeog/Dev/DataMigration && npm install
```

- [ ] **Step 3: 앱 식별자/이름을 DataMigration으로 설정**

`src-tauri/tauri.conf.json`에서 `productName`을 `"DataMigration"`, `identifier`를 `"com.gimjaehyeog.datamigration"`, 창 `title`을 `"DataMigration"`, `width` 1280 / `height` 820 / `minWidth` 720 / `minHeight` 480으로 설정.

- [ ] **Step 4: 빌드가 되는지 확인**

Run: `npm run build`
Expected: TypeScript 컴파일 + Vite 빌드 성공 (`dist/` 생성).

- [ ] **Step 5: vitest 설치 및 설정**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/dom @vitejs/plugin-react
```

`vitest.config.ts` 생성:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true },
});
```

`package.json`의 `scripts`에 `"test": "vitest run"` 추가.

- [ ] **Step 6: 스모크 테스트로 vitest 동작 확인**

Create `src/smoke.test.ts`:

```ts
import { expect, test } from "vitest";

test("vitest runs", () => {
  expect(1 + 1).toBe(2);
});
```

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: Tauri + React + TS 스캐폴드 및 vitest 설정"
```

---

## Task 2: 데이터 타입 정의 (data/types.ts)

**Files:**
- Create: `src/data/types.ts`
- Test: `src/data/types.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/data/types.test.ts`:

```ts
import { expect, test } from "vitest";
import { type CellValue, isEmpty, normalizeType } from "./types";

test("isEmpty는 null/빈문자열을 빈 값으로 본다", () => {
  expect(isEmpty(null)).toBe(true);
  expect(isEmpty("")).toBe(true);
  expect(isEmpty(0 as CellValue)).toBe(false);
  expect(isEmpty("a")).toBe(false);
});

test("normalizeType은 알 수 없는 타입을 string으로 강등한다", () => {
  expect(normalizeType("number")).toBe("number");
  expect(normalizeType("string")).toBe("string");
  expect(normalizeType("weird")).toBe("string");
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/data/types.test.ts`
Expected: FAIL ("./types" 없음).

- [ ] **Step 3: 최소 구현**

`src/data/types.ts`:

```ts
export type DataType = "string" | "number";
export type CellValue = string | number | null;

export interface Column {
  id: string;
  name: string;
  type: DataType;
  values: CellValue[];
}

/** Rust import/export 커맨드와 주고받는 직렬화 형태. */
export interface ColumnData {
  columns: { id: string; name: string; type: DataType }[];
  rows: CellValue[][]; // 행 단위 (Rust가 보내기 쉬움)
}

export function isEmpty(v: CellValue): boolean {
  return v === null || v === "";
}

export function normalizeType(t: string): DataType {
  return t === "number" ? "number" : "string";
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/data/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/types.test.ts
git commit -m "feat: 데이터 타입(DataType/CellValue/Column/ColumnData) 정의"
```

---

## Task 3: ColumnStore (data/ColumnStore.ts)

**Files:**
- Create: `src/data/ColumnStore.ts`
- Test: `src/data/ColumnStore.test.ts`

ColumnStore는 컬럼형 데이터 + "보이는 행 순서" 인덱스 벡터를 보유한다. 불변(immutable) 업데이트로 React 렌더링과 잘 맞는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/data/ColumnStore.test.ts`:

```ts
import { expect, test } from "vitest";
import { ColumnStore } from "./ColumnStore";

function sample(): ColumnStore {
  return ColumnStore.fromRows(
    [
      { id: "c1", name: "name", type: "string" },
      { id: "c2", name: "age", type: "number" },
    ],
    [
      ["Kim Minsu", 30],
      ["Lee Yuna", 25],
    ],
  );
}

test("rowCount/colCount/getCell이 올바르다", () => {
  const s = sample();
  expect(s.rowCount).toBe(2);
  expect(s.colCount).toBe(2);
  expect(s.getCell(0, "c1")).toBe("Kim Minsu");
  expect(s.getCell(1, "c2")).toBe(25);
});

test("setCell은 새 store를 반환하고 원본은 불변", () => {
  const s = sample();
  const s2 = s.setCell(0, "c2", 31);
  expect(s2.getCell(0, "c2")).toBe(31);
  expect(s.getCell(0, "c2")).toBe(30); // 원본 불변
});

test("addColumn은 컬럼을 추가하고 행마다 값을 채운다", () => {
  const s = sample().addColumn(
    { id: "c3", name: "city", type: "string" },
    (rowIndex) => (rowIndex === 0 ? "Seoul" : "Busan"),
  );
  expect(s.colCount).toBe(3);
  expect(s.getCell(0, "c3")).toBe("Seoul");
  expect(s.getCell(1, "c3")).toBe("Busan");
});

test("removeColumn은 컬럼을 제거한다", () => {
  const s = sample().removeColumn("c2");
  expect(s.colCount).toBe(1);
  expect(s.columns[0].id).toBe("c1");
});

test("getColumn은 컬럼 메타+값을 반환한다", () => {
  const col = sample().getColumn("c1");
  expect(col?.name).toBe("name");
  expect(col?.values).toEqual(["Kim Minsu", "Lee Yuna"]);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/data/ColumnStore.test.ts`
Expected: FAIL ("./ColumnStore" 없음).

- [ ] **Step 3: 최소 구현**

`src/data/ColumnStore.ts`:

```ts
import type { CellValue, Column, DataType } from "./types";

interface ColMeta {
  id: string;
  name: string;
  type: DataType;
}

export class ColumnStore {
  private constructor(
    private readonly cols: ColMeta[],
    private readonly data: Map<string, CellValue[]>, // colId -> values
    private readonly length: number,
  ) {}

  static fromRows(
    cols: ColMeta[],
    rows: CellValue[][],
  ): ColumnStore {
    const data = new Map<string, CellValue[]>();
    cols.forEach((c, ci) => {
      data.set(
        c.id,
        rows.map((r) => r[ci] ?? null),
      );
    });
    return new ColumnStore(cols, data, rows.length);
  }

  get rowCount(): number {
    return this.length;
  }
  get colCount(): number {
    return this.cols.length;
  }
  get columns(): ColMeta[] {
    return this.cols;
  }

  getCell(row: number, colId: string): CellValue {
    return this.data.get(colId)?.[row] ?? null;
  }

  getColumn(colId: string): Column | undefined {
    const meta = this.cols.find((c) => c.id === colId);
    const values = this.data.get(colId);
    if (!meta || !values) return undefined;
    return { ...meta, values: [...values] };
  }

  private clone(cols: ColMeta[], data: Map<string, CellValue[]>): ColumnStore {
    return new ColumnStore(cols, data, this.length);
  }

  setCell(row: number, colId: string, value: CellValue): ColumnStore {
    const next = new Map(this.data);
    const arr = [...(next.get(colId) ?? [])];
    arr[row] = value;
    next.set(colId, arr);
    return this.clone(this.cols, next);
  }

  addColumn(meta: ColMeta, fill: (rowIndex: number) => CellValue): ColumnStore {
    const next = new Map(this.data);
    const arr: CellValue[] = [];
    for (let i = 0; i < this.length; i++) arr.push(fill(i));
    next.set(meta.id, arr);
    return this.clone([...this.cols, meta], next);
  }

  removeColumn(colId: string): ColumnStore {
    const next = new Map(this.data);
    next.delete(colId);
    return this.clone(
      this.cols.filter((c) => c.id !== colId),
      next,
    );
  }

  renameColumn(colId: string, name: string): ColumnStore {
    return this.clone(
      this.cols.map((c) => (c.id === colId ? { ...c, name } : c)),
      this.data,
    );
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/data/ColumnStore.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/ColumnStore.ts src/data/ColumnStore.test.ts
git commit -m "feat: ColumnStore 컬럼형 저장소 구현"
```

---

## Task 4: Operation 타입 정의 (ops/operations.ts)

**Files:**
- Create: `src/ops/operations.ts`
- Test: `src/ops/operations.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ops/operations.test.ts`:

```ts
import { expect, test } from "vitest";
import { describeOperation, type Operation } from "./operations";

test("describeOperation은 사람이 읽는 한 줄 설명을 만든다", () => {
  const op: Operation = { kind: "editCell", colId: "c1", row: 0, value: "X" };
  expect(describeOperation(op)).toContain("셀 편집");

  const merge: Operation = {
    kind: "mergeColumns",
    sourceIds: ["c1", "c2"],
    separator: " ",
    newColumnId: "c3",
    newColumnName: "fullname",
  };
  expect(describeOperation(merge)).toContain("합치기");
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/ops/operations.test.ts`
Expected: FAIL.

- [ ] **Step 3: 최소 구현**

`src/ops/operations.ts`:

```ts
import type { CellValue, DataType } from "../data/types";

export type Operation =
  | { kind: "editCell"; colId: string; row: number; value: CellValue }
  | {
      kind: "mergeColumns";
      sourceIds: string[];
      separator: string;
      newColumnId: string;
      newColumnName: string;
    }
  | {
      kind: "splitColumn";
      sourceId: string;
      separator: string;
      newColumns: { id: string; name: string }[];
    }
  | {
      kind: "newColumn";
      id: string;
      name: string;
      type: DataType;
      fillValue: CellValue;
    }
  | { kind: "deleteColumn"; colId: string }
  | { kind: "renameColumn"; colId: string; name: string }
  | { kind: "batch"; ops: Operation[] };

export function describeOperation(op: Operation): string {
  switch (op.kind) {
    case "editCell":
      return `셀 편집 (행 ${op.row + 1})`;
    case "mergeColumns":
      return `컬럼 합치기 → ${op.newColumnName}`;
    case "splitColumn":
      return `컬럼 쪼개기 (${op.sourceId})`;
    case "newColumn":
      return `컬럼 생성 → ${op.name}`;
    case "deleteColumn":
      return `컬럼 삭제 (${op.colId})`;
    case "renameColumn":
      return `컬럼 이름 변경 → ${op.name}`;
    case "batch":
      return `${op.ops.length}개 작업 묶음`;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/ops/operations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ops/operations.ts src/ops/operations.test.ts
git commit -m "feat: Operation 타입 정의"
```

---

## Task 5: 컬럼 변환 함수 (ops/transforms.ts)

**Files:**
- Create: `src/ops/transforms.ts`
- Test: `src/ops/transforms.test.ts`

합치기/쪼개기에 쓰는 순수 함수. M2의 AI 화이트리스트 변환의 기반이 된다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ops/transforms.test.ts`:

```ts
import { expect, test } from "vitest";
import { mergeValues, splitValue } from "./transforms";

test("mergeValues는 구분자로 여러 값을 합친다", () => {
  expect(mergeValues(["Kim", "Minsu"], " ")).toBe("Kim Minsu");
  expect(mergeValues(["a", null, "b"], "-")).toBe("a--b");
});

test("splitValue는 구분자로 값을 N개로 나눈다", () => {
  expect(splitValue("Kim Minsu", " ", 2)).toEqual(["Kim", "Minsu"]);
  expect(splitValue("Kim", " ", 2)).toEqual(["Kim", null]); // 부족하면 null 채움
  expect(splitValue("a b c", " ", 2)).toEqual(["a", "b c"]); // 초과분은 마지막에 합침
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/ops/transforms.test.ts`
Expected: FAIL.

- [ ] **Step 3: 최소 구현**

`src/ops/transforms.ts`:

```ts
import type { CellValue } from "../data/types";

export function mergeValues(values: CellValue[], separator: string): string {
  return values.map((v) => (v === null ? "" : String(v))).join(separator);
}

export function splitValue(
  value: CellValue,
  separator: string,
  parts: number,
): CellValue[] {
  const s = value === null ? "" : String(value);
  const pieces = s.split(separator);
  const out: CellValue[] = [];
  for (let i = 0; i < parts; i++) {
    if (i === parts - 1) {
      // 마지막 칸: 남은 조각을 모두 합침
      out.push(pieces.slice(i).join(separator) || null);
    } else {
      out.push(i < pieces.length ? pieces[i] : null);
    }
  }
  return out;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/ops/transforms.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ops/transforms.ts src/ops/transforms.test.ts
git commit -m "feat: 합치기/쪼개기 변환 함수"
```

---

## Task 6: applyOperation + inverse (ops/applyOperation.ts)

**Files:**
- Create: `src/ops/applyOperation.ts`
- Test: `src/ops/applyOperation.test.ts`

핵심 불변식: **apply → inverse 적용 == 원본**. 모든 op에 대해 검증한다.

- [ ] **Step 1: 실패하는 테스트 작성 (왕복 불변식)**

`src/ops/applyOperation.test.ts`:

```ts
import { expect, test } from "vitest";
import { ColumnStore } from "../data/ColumnStore";
import { applyOperation } from "./applyOperation";
import type { Operation } from "./operations";

function sample(): ColumnStore {
  return ColumnStore.fromRows(
    [
      { id: "c1", name: "first", type: "string" },
      { id: "c2", name: "last", type: "string" },
    ],
    [
      ["Kim", "Minsu"],
      ["Lee", "Yuna"],
    ],
  );
}

function roundTrip(op: Operation) {
  const s = sample();
  const { store: applied, inverse } = applyOperation(s, op);
  const { store: reverted } = applyOperation(applied, inverse);
  // 원본과 동일해야 한다
  for (const c of s.columns) {
    expect(reverted.getColumn(c.id)?.values).toEqual(
      s.getColumn(c.id)?.values,
    );
  }
  expect(reverted.colCount).toBe(s.colCount);
  return applied;
}

test("editCell 적용 + 왕복", () => {
  const applied = roundTrip({
    kind: "editCell",
    colId: "c1",
    row: 0,
    value: "Park",
  });
  expect(applied.getCell(0, "c1")).toBe("Park");
});

test("mergeColumns 적용 + 왕복", () => {
  const applied = roundTrip({
    kind: "mergeColumns",
    sourceIds: ["c1", "c2"],
    separator: " ",
    newColumnId: "full",
    newColumnName: "fullname",
  });
  expect(applied.getCell(0, "full")).toBe("Kim Minsu");
});

test("splitColumn 적용 + 왕복", () => {
  const s = ColumnStore.fromRows(
    [{ id: "c1", name: "name", type: "string" }],
    [["Kim Minsu"], ["Lee Yuna"]],
  );
  const op: Operation = {
    kind: "splitColumn",
    sourceId: "c1",
    separator: " ",
    newColumns: [
      { id: "f", name: "first" },
      { id: "l", name: "last" },
    ],
  };
  const { store: applied, inverse } = applyOperation(s, op);
  expect(applied.getCell(0, "f")).toBe("Kim");
  expect(applied.getCell(0, "l")).toBe("Minsu");
  const { store: reverted } = applyOperation(applied, inverse);
  expect(reverted.getColumn("c1")?.values).toEqual(["Kim Minsu", "Lee Yuna"]);
  expect(reverted.colCount).toBe(1);
});

test("newColumn / deleteColumn / renameColumn 왕복", () => {
  roundTrip({
    kind: "newColumn",
    id: "c3",
    name: "city",
    type: "string",
    fillValue: "Seoul",
  });
  roundTrip({ kind: "deleteColumn", colId: "c2" });
  roundTrip({ kind: "renameColumn", colId: "c1", name: "given" });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/ops/applyOperation.test.ts`
Expected: FAIL.

- [ ] **Step 3: 최소 구현**

`src/ops/applyOperation.ts`:

```ts
import { ColumnStore } from "../data/ColumnStore";
import type { CellValue } from "../data/types";
import type { Operation } from "./operations";
import { mergeValues, splitValue } from "./transforms";

export interface ApplyResult {
  store: ColumnStore;
  inverse: Operation;
}

export function applyOperation(
  store: ColumnStore,
  op: Operation,
): ApplyResult {
  switch (op.kind) {
    case "editCell": {
      const prev = store.getCell(op.row, op.colId);
      return {
        store: store.setCell(op.row, op.colId, op.value),
        inverse: {
          kind: "editCell",
          colId: op.colId,
          row: op.row,
          value: prev,
        },
      };
    }

    case "newColumn": {
      const next = store.addColumn(
        { id: op.id, name: op.name, type: op.type },
        () => op.fillValue,
      );
      return { store: next, inverse: { kind: "deleteColumn", colId: op.id } };
    }

    case "deleteColumn": {
      const col = store.getColumn(op.colId);
      if (!col) return { store, inverse: op };
      // 역연산: 같은 자리에 컬럼을 복원하기 위해 batch(newColumn + 값 복원 editCell들)
      const restores: Operation[] = [
        { kind: "newColumn", id: col.id, name: col.name, type: col.type, fillValue: null },
        ...col.values.map(
          (v, row): Operation => ({ kind: "editCell", colId: col.id, row, value: v }),
        ),
      ];
      return {
        store: store.removeColumn(op.colId),
        inverse: { kind: "batch", ops: restores },
      };
    }

    case "renameColumn": {
      const prev = store.columns.find((c) => c.id === op.colId)?.name ?? op.name;
      return {
        store: store.renameColumn(op.colId, op.name),
        inverse: { kind: "renameColumn", colId: op.colId, name: prev },
      };
    }

    case "mergeColumns": {
      const sources = op.sourceIds.map((id) => store.getColumn(id));
      const next = store.addColumn(
        { id: op.newColumnId, name: op.newColumnName, type: "string" },
        (row) =>
          mergeValues(
            sources.map((c): CellValue => c?.values[row] ?? null),
            op.separator,
          ),
      );
      return {
        store: next,
        inverse: { kind: "deleteColumn", colId: op.newColumnId },
      };
    }

    case "splitColumn": {
      const source = store.getColumn(op.sourceId);
      if (!source) return { store, inverse: op };
      let next = store;
      op.newColumns.forEach((nc, idx) => {
        next = next.addColumn(
          { id: nc.id, name: nc.name, type: "string" },
          (row) =>
            splitValue(source.values[row], op.separator, op.newColumns.length)[idx],
        );
      });
      // 원본 컬럼은 유지한다(쪼갠 결과를 새 컬럼으로 추가). 역연산은 새 컬럼들만 제거.
      return {
        store: next,
        inverse: {
          kind: "batch",
          ops: op.newColumns.map((nc) => ({ kind: "deleteColumn", colId: nc.id })),
        },
      };
    }

    case "batch": {
      let next = store;
      const inverses: Operation[] = [];
      for (const sub of op.ops) {
        const res = applyOperation(next, sub);
        next = res.store;
        inverses.unshift(res.inverse); // 역순으로 되돌려야 함
      }
      return { store: next, inverse: { kind: "batch", ops: inverses } };
    }
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/ops/applyOperation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ops/applyOperation.ts src/ops/applyOperation.test.ts
git commit -m "feat: applyOperation + 역연산(왕복 불변식)"
```

---

## Task 7: History (Undo/Redo) (ops/history.ts)

**Files:**
- Create: `src/ops/history.ts`
- Test: `src/ops/history.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ops/history.test.ts`:

```ts
import { expect, test } from "vitest";
import { ColumnStore } from "../data/ColumnStore";
import { History } from "./history";

function sample(): ColumnStore {
  return ColumnStore.fromRows(
    [{ id: "c1", name: "v", type: "number" }],
    [[1], [2], [3]],
  );
}

test("apply 후 undo/redo가 상태를 되돌리고 다시 적용한다", () => {
  const h = new History(sample());
  h.apply({ kind: "editCell", colId: "c1", row: 0, value: 99 });
  expect(h.store.getCell(0, "c1")).toBe(99);
  expect(h.canUndo).toBe(true);

  h.undo();
  expect(h.store.getCell(0, "c1")).toBe(1);
  expect(h.canRedo).toBe(true);

  h.redo();
  expect(h.store.getCell(0, "c1")).toBe(99);
});

test("새 apply는 redo 스택을 비운다", () => {
  const h = new History(sample());
  h.apply({ kind: "editCell", colId: "c1", row: 0, value: 99 });
  h.undo();
  h.apply({ kind: "editCell", colId: "c1", row: 1, value: 50 });
  expect(h.canRedo).toBe(false);
});

test("entries는 적용된 작업 설명 목록을 제공한다", () => {
  const h = new History(sample());
  h.apply({ kind: "editCell", colId: "c1", row: 0, value: 99 });
  expect(h.entries.length).toBe(1);
  expect(h.entries[0]).toContain("셀 편집");
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/ops/history.test.ts`
Expected: FAIL.

- [ ] **Step 3: 최소 구현**

`src/ops/history.ts`:

```ts
import type { ColumnStore } from "../data/ColumnStore";
import { applyOperation } from "./applyOperation";
import { describeOperation, type Operation } from "./operations";

interface Entry {
  op: Operation;
  inverse: Operation;
}

export class History {
  private undoStack: Entry[] = [];
  private redoStack: Entry[] = [];

  constructor(public store: ColumnStore) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  get entries(): string[] {
    return this.undoStack.map((e) => describeOperation(e.op));
  }

  apply(op: Operation): void {
    const { store, inverse } = applyOperation(this.store, op);
    this.store = store;
    this.undoStack.push({ op, inverse });
    this.redoStack = [];
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    const { store } = applyOperation(this.store, entry.inverse);
    this.store = store;
    this.redoStack.push(entry);
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    const { store } = applyOperation(this.store, entry.op);
    this.store = store;
    this.undoStack.push(entry);
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/ops/history.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ops/history.ts src/ops/history.test.ts
git commit -m "feat: History Undo/Redo 스택"
```

---

## Task 8: Rust import 커맨드 (src-tauri/src/import.rs)

**Files:**
- Create: `src-tauri/src/import.rs`
- Modify: `src-tauri/src/lib.rs` (커맨드 등록), `src-tauri/Cargo.toml` (의존성)

- [ ] **Step 1: Cargo 의존성 추가**

`src-tauri/Cargo.toml`의 `[dependencies]`에 추가:

```toml
calamine = "0.26"
csv = "1.3"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 2: import.rs 작성 (Rust 단위 테스트 포함)**

`src-tauri/src/import.rs`:

```rust
use serde::Serialize;
use std::path::Path;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColumnMeta {
    pub id: String,
    pub name: String,
    pub data_type: String, // "string" | "number"
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnData {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<Vec<serde_json::Value>>,
}

/// 첫 행을 헤더로 사용. 셀이 숫자로 전부 파싱되면 number 타입으로 추론.
fn build(headers: Vec<String>, rows: Vec<Vec<String>>) -> ColumnData {
    let col_count = headers.len();
    let mut is_number = vec![true; col_count];
    for row in &rows {
        for (i, cell) in row.iter().enumerate() {
            if i < col_count && !cell.is_empty() && cell.parse::<f64>().is_err() {
                is_number[i] = false;
            }
        }
    }
    let columns = headers
        .iter()
        .enumerate()
        .map(|(i, h)| ColumnMeta {
            id: format!("col{}", i),
            name: h.clone(),
            data_type: if is_number[i] { "number" } else { "string" }.into(),
        })
        .collect();
    let json_rows = rows
        .into_iter()
        .map(|row| {
            (0..col_count)
                .map(|i| {
                    let cell = row.get(i).cloned().unwrap_or_default();
                    if cell.is_empty() {
                        serde_json::Value::Null
                    } else if is_number[i] {
                        cell.parse::<f64>()
                            .ok()
                            .and_then(serde_json::Number::from_f64)
                            .map(serde_json::Value::Number)
                            .unwrap_or(serde_json::Value::Null)
                    } else {
                        serde_json::Value::String(cell)
                    }
                })
                .collect()
        })
        .collect();
    ColumnData { columns, rows: json_rows }
}

fn parse_csv(path: &Path) -> Result<ColumnData, String> {
    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .from_path(path)
        .map_err(|e| e.to_string())?;
    let mut records: Vec<Vec<String>> = Vec::new();
    for rec in rdr.records() {
        let rec = rec.map_err(|e| e.to_string())?;
        records.push(rec.iter().map(|s| s.to_string()).collect());
    }
    if records.is_empty() {
        return Err("빈 파일입니다".into());
    }
    let headers = records.remove(0);
    Ok(build(headers, records))
}

fn parse_xlsx(path: &Path) -> Result<ColumnData, String> {
    use calamine::{open_workbook_auto, Data, Reader};
    let mut wb = open_workbook_auto(path).map_err(|e| e.to_string())?;
    let name = wb
        .sheet_names()
        .first()
        .cloned()
        .ok_or("시트가 없습니다")?;
    let range = wb.worksheet_range(&name).map_err(|e| e.to_string())?;
    let mut rows: Vec<Vec<String>> = Vec::new();
    for row in range.rows() {
        rows.push(
            row.iter()
                .map(|c| match c {
                    Data::Empty => String::new(),
                    Data::String(s) => s.clone(),
                    Data::Float(f) => f.to_string(),
                    Data::Int(i) => i.to_string(),
                    Data::Bool(b) => b.to_string(),
                    other => other.to_string(),
                })
                .collect(),
        );
    }
    if rows.is_empty() {
        return Err("빈 시트입니다".into());
    }
    let headers = rows.remove(0);
    Ok(build(headers, rows))
}

#[tauri::command]
pub fn import_file(path: String) -> Result<ColumnData, String> {
    let p = Path::new(&path);
    match p.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()) {
        Some(ext) if ext == "csv" || ext == "tsv" || ext == "txt" => parse_csv(p),
        Some(ext) if ext == "xlsx" || ext == "xls" || ext == "xlsm" => parse_xlsx(p),
        _ => Err("지원하지 않는 파일 형식입니다 (csv/xlsx)".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_infers_number_column() {
        let data = build(
            vec!["name".into(), "age".into()],
            vec![
                vec!["Kim".into(), "30".into()],
                vec!["Lee".into(), "25".into()],
            ],
        );
        assert_eq!(data.columns[1].data_type, "number");
        assert_eq!(data.columns[0].data_type, "string");
        assert_eq!(data.rows.len(), 2);
    }

    #[test]
    fn build_handles_empty_cells() {
        let data = build(
            vec!["a".into(), "b".into()],
            vec![vec!["x".into(), "".into()]],
        );
        assert!(data.rows[0][1].is_null());
    }
}
```

- [ ] **Step 3: lib.rs에 모듈/커맨드 등록**

`src-tauri/src/lib.rs`에서 스캐폴드의 `greet` 예제를 제거하고 다음과 같이 한다(스캐폴드 형태에 맞춰 `mod import;`를 파일 상단에, 커맨드를 `invoke_handler`에 등록):

```rust
mod import;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![import::import_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

`tauri_plugin_dialog`를 쓰므로 `Cargo.toml`에 `tauri-plugin-dialog = "2"`를 추가하고, JS 쪽 `@tauri-apps/plugin-dialog`도 설치한다: `npm install @tauri-apps/plugin-dialog`. `src-tauri/capabilities/default.json`의 `permissions`에 `"dialog:default"`를 추가한다.

- [ ] **Step 4: Rust 테스트 실행**

Run: `cd src-tauri && cargo test`
Expected: PASS (2 tests: build_infers_number_column, build_handles_empty_cells).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/import.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/capabilities/default.json package.json package-lock.json
git commit -m "feat: Rust import 커맨드(CSV/XLSX 파싱 + 타입 추론)"
```

---

## Task 9: Rust export 커맨드 (src-tauri/src/export.rs)

**Files:**
- Create: `src-tauri/src/export.rs`
- Modify: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`

- [ ] **Step 1: Cargo 의존성 추가**

`src-tauri/Cargo.toml`의 `[dependencies]`에 추가:

```toml
rust_xlsxwriter = "0.79"
```

- [ ] **Step 2: export.rs 작성**

`src-tauri/src/export.rs`:

```rust
use serde::Deserialize;
use std::path::Path;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportColumn {
    pub name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub columns: Vec<ExportColumn>,
    pub rows: Vec<Vec<serde_json::Value>>,
}

fn cell_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Null => String::new(),
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

fn write_csv(path: &Path, data: &ExportData) -> Result<(), String> {
    let mut wtr = csv::Writer::from_path(path).map_err(|e| e.to_string())?;
    wtr.write_record(data.columns.iter().map(|c| &c.name))
        .map_err(|e| e.to_string())?;
    for row in &data.rows {
        wtr.write_record(row.iter().map(cell_to_string))
            .map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}

fn write_xlsx(path: &Path, data: &ExportData) -> Result<(), String> {
    use rust_xlsxwriter::Workbook;
    let mut wb = Workbook::new();
    let sheet = wb.add_worksheet();
    for (c, col) in data.columns.iter().enumerate() {
        sheet
            .write_string(0, c as u16, &col.name)
            .map_err(|e| e.to_string())?;
    }
    for (r, row) in data.rows.iter().enumerate() {
        for (c, cell) in row.iter().enumerate() {
            let row_idx = (r + 1) as u32;
            match cell {
                serde_json::Value::Number(n) => {
                    sheet
                        .write_number(row_idx, c as u16, n.as_f64().unwrap_or(0.0))
                        .map_err(|e| e.to_string())?;
                }
                serde_json::Value::Null => {}
                other => {
                    sheet
                        .write_string(row_idx, c as u16, &cell_to_string(other))
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }
    wb.save(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn export_file(path: String, data: ExportData) -> Result<(), String> {
    let p = Path::new(&path);
    match p.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()) {
        Some(ext) if ext == "csv" => write_csv(p, &data),
        Some(ext) if ext == "xlsx" => write_xlsx(p, &data),
        _ => Err("지원하지 않는 내보내기 형식입니다 (csv/xlsx)".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn csv_export_roundtrips() {
        let dir = std::env::temp_dir();
        let path = dir.join("dm_export_test.csv");
        let data = ExportData {
            columns: vec![ExportColumn { name: "a".into() }, ExportColumn { name: "b".into() }],
            rows: vec![vec![
                serde_json::Value::String("x".into()),
                serde_json::json!(3.0),
            ]],
        };
        write_csv(&path, &data).unwrap();
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains("a,b"));
        assert!(content.contains("x,3"));
    }
}
```

- [ ] **Step 3: lib.rs에 등록**

`src-tauri/src/lib.rs` 상단에 `mod export;` 추가, `invoke_handler`를 다음으로 변경:

```rust
.invoke_handler(tauri::generate_handler![
    import::import_file,
    export::export_file
])
```

- [ ] **Step 4: Rust 테스트 실행**

Run: `cd src-tauri && cargo test`
Expected: PASS (import 2 + export 1 = 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/export.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat: Rust export 커맨드(CSV/XLSX 쓰기)"
```

---

## Task 10: io 브리지 (importFile.ts / exportFile.ts)

**Files:**
- Create: `src/io/importFile.ts`, `src/io/exportFile.ts`
- Test: `src/io/importFile.test.ts`

Rust 커맨드 응답(ColumnData)을 ColumnStore로 변환하는 순수 매핑 함수를 분리해 테스트한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/io/importFile.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test src/io/importFile.test.ts`
Expected: FAIL.

- [ ] **Step 3: 최소 구현**

`src/io/importFile.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { ColumnStore } from "../data/ColumnStore";
import type { CellValue } from "../data/types";
import { normalizeType } from "../data/types";

interface RustColumnData {
  columns: { id: string; name: string; dataType: string }[];
  rows: CellValue[][];
}

export function columnDataToStore(data: RustColumnData): ColumnStore {
  return ColumnStore.fromRows(
    data.columns.map((c) => ({
      id: c.id,
      name: c.name,
      type: normalizeType(c.dataType),
    })),
    data.rows,
  );
}

/** 파일 선택 대화상자 → Rust 파싱 → ColumnStore. 취소 시 null. */
export async function importFileDialog(): Promise<ColumnStore | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: "데이터", extensions: ["csv", "xlsx", "xls"] }],
  });
  if (typeof path !== "string") return null;
  const data = await invoke<RustColumnData>("import_file", { path });
  return columnDataToStore(data);
}
```

`src/io/exportFile.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { ColumnStore } from "../data/ColumnStore";

export function storeToExportData(store: ColumnStore) {
  const columns = store.columns.map((c) => ({ name: c.name }));
  const rows: (string | number | null)[][] = [];
  for (let r = 0; r < store.rowCount; r++) {
    rows.push(store.columns.map((c) => store.getCell(r, c.id)));
  }
  return { columns, rows };
}

/** 저장 위치 선택 → Rust 내보내기. 취소 시 false. */
export async function exportFileDialog(store: ColumnStore): Promise<boolean> {
  const path = await save({
    filters: [
      { name: "Excel", extensions: ["xlsx"] },
      { name: "CSV", extensions: ["csv"] },
    ],
  });
  if (!path) return false;
  await invoke("export_file", { path, data: storeToExportData(store) });
  return true;
}
```

- [ ] **Step 4: 테스트 통과 확인**

`@tauri-apps/api`/`plugin-dialog` import는 jsdom에서 로드되지만 테스트는 순수 함수(`columnDataToStore`)만 호출하므로 통과한다.

Run: `npm test src/io/importFile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/io/importFile.ts src/io/exportFile.ts src/io/importFile.test.ts
git commit -m "feat: import/export io 브리지"
```

---

## Task 11: DataGrid (grid/DataGrid.tsx)

**Files:**
- Create: `src/grid/DataGrid.tsx`
- Modify: `package.json` (glide-data-grid 설치)

이 태스크는 UI 통합이라 단위 테스트보다 수동 확인 위주다.

- [ ] **Step 1: glide-data-grid 설치**

```bash
npm install @glideapps/glide-data-grid
```

`@glideapps/glide-data-grid`는 CSS와 `lodash`, `marked`, `react-responsive-carousel`를 peer로 요구할 수 있다. 설치 후 빌드 에러가 나면 메시지에 표시된 peer 패키지를 설치한다.

- [ ] **Step 2: DataGrid 컴포넌트 작성**

`src/grid/DataGrid.tsx`:

```tsx
import "@glideapps/glide-data-grid/dist/index.css";
import {
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type GridColumn,
  type Item,
  DataEditor,
} from "@glideapps/glide-data-grid";
import { useCallback, useMemo } from "react";
import type { ColumnStore } from "../data/ColumnStore";

interface Props {
  store: ColumnStore;
  onEditCell: (row: number, colId: string, value: string) => void;
}

export function DataGrid({ store, onEditCell }: Props) {
  const columns: GridColumn[] = useMemo(
    () => store.columns.map((c) => ({ title: c.name, id: c.id, width: 160 })),
    [store],
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const colMeta = store.columns[col];
      const raw = store.getCell(row, colMeta.id);
      const text = raw === null ? "" : String(raw);
      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        allowOverlay: true,
      };
    },
    [store],
  );

  const onCellEdited = useCallback(
    ([col, row]: Item, newValue: EditableGridCell) => {
      if (newValue.kind !== GridCellKind.Text) return;
      const colMeta = store.columns[col];
      onEditCell(row, colMeta.id, newValue.data);
    },
    [store, onEditCell],
  );

  return (
    <DataEditor
      columns={columns}
      rows={store.rowCount}
      getCellContent={getCellContent}
      onCellEdited={onCellEdited}
      smoothScrollX
      smoothScrollY
      width="100%"
      height="100%"
    />
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 컴파일 성공.

- [ ] **Step 4: Commit**

```bash
git add src/grid/DataGrid.tsx package.json package-lock.json
git commit -m "feat: glide-data-grid 가상화 편집 그리드"
```

---

## Task 12: Toolbar (views/Toolbar.tsx)

**Files:**
- Create: `src/views/Toolbar.tsx`

- [ ] **Step 1: Toolbar 컴포넌트 작성**

`src/views/Toolbar.tsx`:

```tsx
interface Props {
  onImport: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onMerge: () => void;
  onSplit: () => void;
  onNewColumn: () => void;
}

export function Toolbar(p: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: 8,
        borderBottom: "1px solid #ddd",
        alignItems: "center",
      }}
    >
      <button onClick={p.onImport}>가져오기</button>
      <button onClick={p.onExport}>내보내기</button>
      <span style={{ width: 1, height: 20, background: "#ddd" }} />
      <button onClick={p.onUndo} disabled={!p.canUndo}>
        ↶ 되돌리기
      </button>
      <button onClick={p.onRedo} disabled={!p.canRedo}>
        ↷ 다시실행
      </button>
      <span style={{ width: 1, height: 20, background: "#ddd" }} />
      <button onClick={p.onMerge}>컬럼 합치기</button>
      <button onClick={p.onSplit}>컬럼 쪼개기</button>
      <button onClick={p.onNewColumn}>컬럼 생성</button>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 컴파일 성공(아직 RootView에서 미사용 → Task 13에서 연결).

- [ ] **Step 3: Commit**

```bash
git add src/views/Toolbar.tsx
git commit -m "feat: Toolbar 컴포넌트"
```

---

## Task 13: RootView 통합 (views/RootView.tsx + App.tsx)

**Files:**
- Create: `src/views/RootView.tsx`
- Modify: `src/App.tsx`
- Modify: `package.json` (react-resizable-panels)

History를 React 상태로 보유하고 Toolbar/DataGrid를 연결한다. 합치기/쪼개기/생성은 M1에서는 간단한 `prompt()` 입력으로 처리하고(빠른 동작 확인 목적), M2에서 AI/다이얼로그로 대체한다.

- [ ] **Step 1: react-resizable-panels 설치**

```bash
npm install react-resizable-panels
```

- [ ] **Step 2: RootView 작성**

`src/views/RootView.tsx`:

```tsx
import { useCallback, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ColumnStore } from "../data/ColumnStore";
import { History } from "../ops/history";
import type { Operation } from "../ops/operations";
import { DataGrid } from "../grid/DataGrid";
import { Toolbar } from "./Toolbar";
import { importFileDialog } from "../io/importFile";
import { exportFileDialog } from "../io/exportFile";

const EMPTY = ColumnStore.fromRows([], []);

export function RootView() {
  const historyRef = useRef(new History(EMPTY));
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  const apply = useCallback(
    (op: Operation) => {
      historyRef.current.apply(op);
      rerender();
    },
    [rerender],
  );

  const store = historyRef.current.store;

  const onImport = useCallback(async () => {
    const s = await importFileDialog();
    if (s) {
      historyRef.current = new History(s);
      rerender();
    }
  }, [rerender]);

  const onExport = useCallback(() => exportFileDialog(store), [store]);

  const onEditCell = useCallback(
    (row: number, colId: string, value: string) =>
      apply({ kind: "editCell", colId, row, value }),
    [apply],
  );

  const onNewColumn = useCallback(() => {
    const name = prompt("새 컬럼 이름");
    if (!name) return;
    apply({
      kind: "newColumn",
      id: `c_${Date.now()}`,
      name,
      type: "string",
      fillValue: "",
    });
  }, [apply]);

  const onMerge = useCallback(() => {
    const ids = prompt("합칠 컬럼 id들(쉼표로 구분, 예: col0,col1)");
    if (!ids) return;
    apply({
      kind: "mergeColumns",
      sourceIds: ids.split(",").map((s) => s.trim()),
      separator: " ",
      newColumnId: `c_${Date.now()}`,
      newColumnName: "merged",
    });
  }, [apply]);

  const onSplit = useCallback(() => {
    const id = prompt("쪼갤 컬럼 id (예: col0)");
    if (!id) return;
    apply({
      kind: "splitColumn",
      sourceId: id,
      separator: " ",
      newColumns: [
        { id: `c_${Date.now()}_a`, name: "part1" },
        { id: `c_${Date.now()}_b`, name: "part2" },
      ],
    });
  }, [apply]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar
        onImport={onImport}
        onExport={onExport}
        onUndo={() => {
          historyRef.current.undo();
          rerender();
        }}
        onRedo={() => {
          historyRef.current.redo();
          rerender();
        }}
        canUndo={historyRef.current.canUndo}
        canRedo={historyRef.current.canRedo}
        onMerge={onMerge}
        onSplit={onSplit}
        onNewColumn={onNewColumn}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={75} minSize={40}>
            <div style={{ height: "100%" }}>
              {store.rowCount === 0 ? (
                <div style={{ padding: 24, color: "#888" }}>
                  파일을 가져오세요 (가져오기 버튼)
                </div>
              ) : (
                <DataGrid store={store} onEditCell={onEditCell} />
              )}
            </div>
          </Panel>
          <PanelResizeHandle style={{ width: 4, background: "#eee" }} />
          <Panel defaultSize={25} minSize={15}>
            <div style={{ padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>히스토리</h3>
              <ol style={{ fontSize: 13, paddingLeft: 18 }}>
                {historyRef.current.entries.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ol>
              <p style={{ color: "#aaa", fontSize: 12 }}>
                (M2에서 이 자리에 AI 패널이 들어갑니다)
              </p>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: App.tsx 교체**

`src/App.tsx`:

```tsx
import { RootView } from "./views/RootView";

export default function App() {
  return <RootView />;
}
```

스캐폴드가 만든 `src/App.css`의 데모 스타일이 그리드와 충돌하면 비우거나 삭제한다.

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 컴파일 성공.

- [ ] **Step 5: 앱 수동 실행 및 동작 확인**

Run: `npm run tauri dev`

확인 항목:
1. 앱 창이 뜬다.
2. "가져오기"로 CSV/XLSX를 열면 그리드에 표시된다(수만 행도 스크롤이 부드러운지).
3. 셀을 더블클릭해 편집 → 히스토리에 "셀 편집"이 쌓인다.
4. "되돌리기/다시실행"이 동작한다.
5. "컬럼 생성/합치기/쪼개기"가 동작한다.
6. "내보내기"로 저장한 파일이 정상적으로 열린다.

- [ ] **Step 6: Commit**

```bash
git add src/views/RootView.tsx src/App.tsx src/App.css package.json package-lock.json
git commit -m "feat: RootView 통합(그리드+툴바+히스토리 패널)"
```

---

## Self-Review 메모

- **Spec 커버리지**: import(Task 8,10) / export(Task 9,10) / 엑셀식 편집(Task 11) / 합치기·쪼개기·컬럼생성(Task 4~6, 13) / 가상화(Task 11) / Undo 히스토리(Task 6,7,13) / 컬럼형 저장(Task 3) — 모두 태스크 존재. AI(M2)·자동 업데이터(M3)는 의도적으로 이 계획 범위 밖.
- **타입 일관성**: Rust는 `dataType`(camelCase) 직렬화 → JS `normalizeType`이 받음. `ColumnStore`의 메서드명(`setCell`/`addColumn`/`removeColumn`/`renameColumn`/`getColumn`)이 `applyOperation` 전체에서 일관 사용됨.
- **알려진 단순화(의도적)**: M1의 합치기/쪼개기/생성은 `prompt()` 입력 → M2에서 다이얼로그/AI로 대체. RootView는 `forceRender`로 History 가변 객체를 갱신(M2에서 상태관리 정리 가능).
