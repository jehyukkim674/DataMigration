import type { CellValue } from "../data/types";

export function mergeValues(values: CellValue[], separator: string): string {
  return values.map((v) => (v === null ? "" : String(v))).join(separator);
}

export type SplitMode = "separator" | "regex" | "capture";

/** value를 모드에 따라 조각 배열로 만든다. capture는 정규식 캡처 그룹들. */
export function splitToPieces(value: string, separator: string, mode: SplitMode): string[] {
  if (mode === "capture") {
    try {
      const m = value.match(new RegExp(separator));
      return m ? m.slice(1).map((g) => g ?? "") : [];
    } catch {
      return [];
    }
  }
  if (mode === "regex") {
    try {
      return value.split(new RegExp(separator));
    } catch {
      return [value];
    }
  }
  return separator === "" ? [value] : value.split(separator);
}

/** 모드별로 나눈 뒤 index번째 조각을 반환(범위 밖/빈 조각은 null). */
export function splitPiece(value: CellValue, separator: string, index: number, mode: SplitMode = "separator"): CellValue {
  const s = value === null ? "" : String(value);
  if (s === "") return null;
  const pieces = splitToPieces(s, separator, mode);
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
