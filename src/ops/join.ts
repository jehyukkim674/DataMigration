import type { CellValue, DataType } from "../data/types";

export interface Table {
  columns: { name: string; type: DataType }[];
  rows: CellValue[][];
}

export type JoinType = "inner" | "left" | "full";

function keyStr(v: CellValue): string | null {
  return v === null || v === "" ? null : String(v);
}

/** 이름 충돌 시 _2, _3 … 붙여 고유 컬럼명 생성. */
function uniqueNames(aNames: string[], bNames: string[]): string[] {
  const used = new Set(aNames);
  return bNames.map((n) => {
    let name = n;
    let i = 2;
    while (used.has(name)) name = `${n}_${i++}`;
    used.add(name);
    return name;
  });
}

/**
 * 두 테이블을 a의 aKey, b의 bKey 컬럼 값으로 조인.
 * - inner: 양쪽 모두 매칭되는 행만
 * - left: a 전부 + 매칭되는 b (b 없으면 b쪽 컬럼 null)
 * - full: left + 매칭 안 된 b 행(이쪽은 a 컬럼 null)
 * 결과 컬럼 = a 컬럼 + b 컬럼(이름 충돌 시 _2…).
 */
export function joinTables(
  a: Table,
  aKey: number,
  b: Table,
  bKey: number,
  type: JoinType,
): Table {
  const bColNames = uniqueNames(
    a.columns.map((c) => c.name),
    b.columns.map((c) => c.name),
  );
  const columns = [
    ...a.columns.map((c) => ({ name: c.name, type: c.type })),
    ...b.columns.map((c, i) => ({ name: bColNames[i], type: c.type })),
  ];
  const aNulls: CellValue[] = a.columns.map(() => null);
  const bNulls: CellValue[] = b.columns.map(() => null);

  // b의 키값 → 행 인덱스들
  const bIndex = new Map<string, number[]>();
  b.rows.forEach((row, i) => {
    const k = keyStr(row[bKey]);
    if (k === null) return;
    const arr = bIndex.get(k);
    if (arr) arr.push(i);
    else bIndex.set(k, [i]);
  });

  const rows: CellValue[][] = [];
  const matchedB = new Set<number>();

  for (const aRow of a.rows) {
    const k = keyStr(aRow[aKey]);
    const matches = k === null ? undefined : bIndex.get(k);
    if (matches && matches.length > 0) {
      for (const bi of matches) {
        matchedB.add(bi);
        rows.push([...aRow, ...b.rows[bi]]);
      }
    } else if (type !== "inner") {
      rows.push([...aRow, ...bNulls]);
    }
  }

  if (type === "full") {
    b.rows.forEach((bRow, i) => {
      if (!matchedB.has(i)) rows.push([...aNulls, ...bRow]);
    });
  }

  return { columns, rows };
}
