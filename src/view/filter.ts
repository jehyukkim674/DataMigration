import type { CellValue } from "../data/types";
import type { FilterCondition } from "./viewState";

function num(v: CellValue | string | number | undefined): number {
  return typeof v === "number" ? v : Number(v);
}

export function evalCondition(cell: CellValue, cond: FilterCondition): boolean {
  const isEmpty = cell === null || cell === "";
  switch (cond.op) {
    case "empty":
      return isEmpty;
    case "notEmpty":
      return !isEmpty;
  }
  if (cond.value === undefined) return true;
  const target = cond.value;
  switch (cond.op) {
    case "eq":
      return String(cell) === String(target);
    case "neq":
      return String(cell) !== String(target);
    case "gt":
      return num(cell) > num(target);
    case "gte":
      return num(cell) >= num(target);
    case "lt":
      return num(cell) < num(target);
    case "lte":
      return num(cell) <= num(target);
    case "contains":
      return String(cell).includes(String(target));
    case "startsWith":
      return String(cell).startsWith(String(target));
    case "endsWith":
      return String(cell).endsWith(String(target));
    default:
      return true;
  }
}
