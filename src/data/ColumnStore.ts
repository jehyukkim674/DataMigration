import type { CellValue, Column, DataType } from "./types";

interface ColMeta {
  id: string;
  name: string;
  type: DataType;
}

export class ColumnStore {
  private constructor(
    private readonly cols: ColMeta[],
    private readonly data: Map<string, CellValue[]>,
    private readonly length: number,
  ) {}

  static fromRows(cols: ColMeta[], rows: CellValue[][]): ColumnStore {
    const data = new Map<string, CellValue[]>();
    cols.forEach((c, ci) => {
      data.set(c.id, rows.map((r) => r[ci] ?? null));
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

  /** 내부 값 배열을 복사 없이 반환(읽기 전용). 정렬·집계 등 성능 경로 전용. */
  rawValues(colId: string): readonly CellValue[] | undefined {
    return this.data.get(colId);
  }

  getColumn(colId: string): Column | undefined {
    const meta = this.cols.find((c) => c.id === colId);
    const values = this.data.get(colId);
    if (!meta || !values) return undefined;
    return { ...meta, values: [...values] };
  }

  /** 컬럼의 고유값 목록(빈 값 제외, 정렬). 엑셀식 값 선택 필터용. */
  uniqueValues(colId: string): CellValue[] {
    const values = this.data.get(colId);
    if (!values) return [];
    const seen = new Set<string>();
    const out: CellValue[] = [];
    for (const v of values) {
      if (v === null || v === "") continue;
      const key = String(v);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    out.sort((a, b) =>
      typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b)),
    );
    return out;
  }

  /** 컬럼의 고유값별 건수(빈 값 제외, 정렬). 값 선택 필터에서 건수 표시용. */
  uniqueValueCounts(colId: string): { value: CellValue; count: number }[] {
    const values = this.data.get(colId);
    if (!values) return [];
    const counts = new Map<string, { value: CellValue; count: number }>();
    for (const v of values) {
      if (v === null || v === "") continue;
      const key = String(v);
      const e = counts.get(key);
      if (e) e.count++;
      else counts.set(key, { value: v, count: 1 });
    }
    return [...counts.values()].sort((a, b) =>
      typeof a.value === "number" && typeof b.value === "number"
        ? a.value - b.value
        : String(a.value).localeCompare(String(b.value)),
    );
  }

  /** 컬럼 전체 값을 교체한 새 store(길이 동일). REPLACE 등에 사용. */
  setColumnValues(colId: string, values: CellValue[]): ColumnStore {
    if (!this.data.has(colId)) return this;
    const next = new Map(this.data);
    next.set(colId, [...values]);
    return this.clone(this.cols, next);
  }

  /** 주어진 원본 행 인덱스들을 삭제한 새 store. */
  removeRows(indices: number[]): ColumnStore {
    const toRemove = new Set(indices);
    const next = new Map<string, CellValue[]>();
    for (const [id, arr] of this.data) {
      next.set(id, arr.filter((_, i) => !toRemove.has(i)));
    }
    return new ColumnStore(this.cols, next, this.length - toRemove.size);
  }

  /**
   * 행들을 원래 인덱스 위치에 다시 삽입(removeRows의 역연산).
   * 컬럼마다 splice를 반복하지 않고(O(rows×inserts)), 최종 위치를 미리 계산해
   * 한 번의 선형 패스로 채운다(O(rows+inserts)).
   */
  insertRows(rowsData: { index: number; cells: Record<string, CellValue> }[]): ColumnStore {
    const total = this.length + rowsData.length;
    const next = new Map<string, CellValue[]>();
    for (const c of this.cols) {
      const orig = this.data.get(c.id) ?? [];
      // 삽입 행의 최종 위치 → 값. (removeRows가 기록한 index가 곧 복원될 최종 위치)
      const insertAt = new Map<number, CellValue>();
      for (const rd of rowsData) insertAt.set(rd.index, rd.cells[c.id] ?? null);
      const out: CellValue[] = new Array(total);
      let oi = 0;
      for (let pos = 0; pos < total; pos++) {
        out[pos] = insertAt.has(pos) ? insertAt.get(pos)! : orig[oi++];
      }
      next.set(c.id, out);
    }
    return new ColumnStore(this.cols, next, total);
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
    return this.clone(this.cols.filter((c) => c.id !== colId), next);
  }

  renameColumn(colId: string, name: string): ColumnStore {
    return this.clone(
      this.cols.map((c) => (c.id === colId ? { ...c, name } : c)),
      this.data,
    );
  }
}
