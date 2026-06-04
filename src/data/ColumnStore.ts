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

  /** 주어진 원본 행 인덱스들을 삭제한 새 store. */
  removeRows(indices: number[]): ColumnStore {
    const toRemove = new Set(indices);
    const next = new Map<string, CellValue[]>();
    for (const [id, arr] of this.data) {
      next.set(id, arr.filter((_, i) => !toRemove.has(i)));
    }
    return new ColumnStore(this.cols, next, this.length - toRemove.size);
  }

  /** 행들을 원래 인덱스 위치에 다시 삽입(removeRows의 역연산). 오름차순으로 삽입. */
  insertRows(rowsData: { index: number; cells: Record<string, CellValue> }[]): ColumnStore {
    const sorted = [...rowsData].sort((a, b) => a.index - b.index);
    const next = new Map<string, CellValue[]>();
    for (const c of this.cols) {
      const arr = [...(this.data.get(c.id) ?? [])];
      for (const rd of sorted) arr.splice(rd.index, 0, rd.cells[c.id] ?? null);
      next.set(c.id, arr);
    }
    return new ColumnStore(this.cols, next, this.length + sorted.length);
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
