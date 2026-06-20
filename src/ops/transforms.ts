import type { CellValue } from "../data/types";

export function mergeValues(values: CellValue[], separator: string): string {
  return values.map((v) => (v === null ? "" : String(v))).join(separator);
}

/** 셀 값에서 find를 replace로 치환(전체). regex=true면 find를 정규식으로. 결과가 빈 문자열이면 null. */
export function replaceCell(value: CellValue, find: string, replace: string, regex: boolean): CellValue {
  if (value === null) return null;
  const s = String(value);
  let out: string;
  if (regex) {
    try {
      out = s.replace(new RegExp(find, "g"), replace);
    } catch {
      out = s; // 잘못된 정규식이면 변경 안 함
    }
  } else {
    out = find === "" ? s : s.split(find).join(replace);
  }
  return out === "" ? null : out;
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
  // 빈 구분자는 글자 단위로 쪼개지므로(원치 않는 동작), 전체 값을 첫 조각에 둔다.
  const pieces = separator === "" ? [s] : s.split(separator);
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
