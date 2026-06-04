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
    case "in":
      return (cond.values ?? []).some((v) => String(v) === String(cell ?? ""));
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
    case "like":
      return likeMatch(String(cell), String(target));
    default:
      return true;
  }
}

/** SQL LIKE: %=임의 문자열, _=한 글자. 대소문자 무시. */
function likeMatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = "^" + escaped.replace(/%/g, ".*").replace(/_/g, ".") + "$";
  return new RegExp(regex, "i").test(value);
}
