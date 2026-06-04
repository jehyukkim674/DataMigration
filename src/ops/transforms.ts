import type { CellValue } from "../data/types";

export function mergeValues(values: CellValue[], separator: string): string {
  return values.map((v) => (v === null ? "" : String(v))).join(separator);
}

/** 구분자로 나눈 뒤 index번째 조각을 반환(범위 밖/빈 조각은 null). 잔여분 흡수 없음. regex=true면 구분자를 정규식으로 해석. */
export function splitPiece(value: CellValue, separator: string, index: number, regex = false): CellValue {
  const s = value === null ? "" : String(value);
  if (s === "") return null;
  let pieces: string[];
  if (regex) {
    try {
      pieces = s.split(new RegExp(separator));
    } catch {
      pieces = [s]; // 잘못된 정규식이면 분리하지 않음
    }
  } else {
    pieces = separator === "" ? [s] : s.split(separator);
  }
  const p = index >= 0 && index < pieces.length ? pieces[index] : "";
  return p === "" ? null : p;
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
      out.push(pieces.slice(i).join(separator) || null);
    } else {
      out.push(i < pieces.length ? pieces[i] : null);
    }
  }
  return out;
}
