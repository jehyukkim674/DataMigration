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
      out.push(pieces.slice(i).join(separator) || null);
    } else {
      out.push(i < pieces.length ? pieces[i] : null);
    }
  }
  return out;
}
