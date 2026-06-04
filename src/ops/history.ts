import type { ColumnStore } from "../data/ColumnStore";
import { applyOperation } from "./applyOperation";
import { describeOperation, type Operation } from "./operations";

interface Entry {
  op: Operation;
  inverse: Operation;
}

export class History {
  private undoStack: Entry[] = [];
  private redoStack: Entry[] = [];

  constructor(public store: ColumnStore) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  get entries(): string[] {
    return this.undoStack.map((e) => describeOperation(e.op));
  }

  apply(op: Operation): void {
    const { store, inverse } = applyOperation(this.store, op);
    this.store = store;
    this.undoStack.push({ op, inverse });
    this.redoStack = [];
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    const { store } = applyOperation(this.store, entry.inverse);
    this.store = store;
    this.redoStack.push(entry);
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    const { store } = applyOperation(this.store, entry.op);
    this.store = store;
    this.undoStack.push(entry);
  }
}
