/** 출처(A/B…) 색상 — 상태바/헤더/컬럼설정에서 공통 사용. */
export const SOURCE_COLORS = ["#2f6fed", "#e5774a", "#2e9e5b", "#9b59b6", "#d4a017"];

export interface SourceInfo {
  letterOf: Record<string, string>; // colId → "A"/"B"…
  colorOf: Record<string, string>; // colId → 색상
  legend: { letter: string; name: string; color: string }[];
  hasSource: boolean;
}

/** columnSource(colId→출처명)로부터 A/B 문자·색상·범례를 계산. */
export function computeSourceInfo(columnSource?: Record<string, string>): SourceInfo {
  const cs = columnSource ?? {};
  const distinct: string[] = [];
  for (const src of Object.values(cs)) if (!distinct.includes(src)) distinct.push(src);

  const letterOf: Record<string, string> = {};
  const colorOf: Record<string, string> = {};
  for (const [colId, src] of Object.entries(cs)) {
    const idx = distinct.indexOf(src);
    letterOf[colId] = String.fromCharCode(65 + idx);
    colorOf[colId] = SOURCE_COLORS[idx % SOURCE_COLORS.length];
  }
  const legend = distinct.map((name, i) => ({
    letter: String.fromCharCode(65 + i),
    name,
    color: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));
  return { letterOf, colorOf, legend, hasSource: distinct.length > 0 };
}
