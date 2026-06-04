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
