import type { CellValue, DataType } from "../data/types";

export interface Table {
  columns: { name: string; type: DataType }[];
  rows: CellValue[][];
}

export type JoinType = "inner" | "left" | "full";

export interface JoinResult extends Table {
  sources: string[]; // 컬럼별 출처 라벨(A/B 파일명)
}

function keyStr(v: CellValue): string | null {
  return v === null || v === "" ? null : String(v);
}

/** B 컬럼명이 A와 겹치면 출처 라벨을 붙여 구분(예: "도시 (B.csv)"). */
function resolveBNames(aNames: string[], bNames: string[], bLabel: string): string[] {
  const used = new Set(aNames);
  return bNames.map((n) => {
    let name = used.has(n) ? `${n} (${bLabel})` : n;
    let i = 2;
    while (used.has(name)) name = `${n} (${bLabel} ${i++})`;
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
  labels: { a: string; b: string } = { a: "A", b: "B" },
): JoinResult {
  const bColNames = resolveBNames(
    a.columns.map((c) => c.name),
    b.columns.map((c) => c.name),
    labels.b,
  );
  const columns = [
    ...a.columns.map((c) => ({ name: c.name, type: c.type })),
    ...b.columns.map((c, i) => ({ name: bColNames[i], type: c.type })),
  ];
  const sources = [
    ...a.columns.map(() => labels.a),
    ...b.columns.map(() => labels.b),
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

  return { columns, rows, sources };
}
