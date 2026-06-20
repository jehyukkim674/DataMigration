import type { CellValue } from "../data/types";
import type { FilterCondition } from "./viewState";

function num(v: CellValue | string | number | undefined): number {
  return typeof v === "number" ? v : Number(v);
}

/** 비교용 문자열. null은 "null"이 아니라 빈 문자열로 본다(빈 셀이 리터럴과 오매칭되지 않도록). */
function str(v: CellValue): string {
  return v === null ? "" : String(v);
}

// 조건 객체별 캐시: 한 번의 필터 패스(전체 행)에서 정규식/Set을 한 번만 만든다.
const likeRegexCache = new WeakMap<FilterCondition, RegExp>();
const inSetCache = new WeakMap<FilterCondition, Set<string>>();

export function evalCondition(cell: CellValue, cond: FilterCondition): boolean {
  const isEmpty = cell === null || cell === "";
  switch (cond.op) {
    case "empty":
      return isEmpty;
    case "notEmpty":
      return !isEmpty;
    case "in": {
      let set = inSetCache.get(cond);
      if (!set) {
        set = new Set((cond.values ?? []).map((v) => String(v)));
        inSetCache.set(cond, set);
      }
      return set.has(String(cell ?? ""));
    }
  }
  if (cond.value === undefined) return true;
  const target = cond.value;
  switch (cond.op) {
    case "eq":
      return str(cell) === String(target);
    case "neq":
      return str(cell) !== String(target);
    // 숫자 비교: 빈 셀은 0이 아니라 "비교 불가"로 보고 항상 false.
    case "gt":
      return !isEmpty && num(cell) > num(target);
    case "gte":
      return !isEmpty && num(cell) >= num(target);
    case "lt":
      return !isEmpty && num(cell) < num(target);
    case "lte":
      return !isEmpty && num(cell) <= num(target);
    // 부분 문자열 비교는 like와 동일하게 대소문자 무시.
    case "contains":
      return str(cell).toLowerCase().includes(String(target).toLowerCase());
    case "startsWith":
      return str(cell).toLowerCase().startsWith(String(target).toLowerCase());
    case "endsWith":
      return str(cell).toLowerCase().endsWith(String(target).toLowerCase());
    case "like": {
      let regex = likeRegexCache.get(cond);
      if (!regex) {
        regex = buildLikeRegex(String(target));
        likeRegexCache.set(cond, regex);
      }
      return regex.test(str(cell));
    }
    default:
      return true;
  }
}

/** SQL LIKE: %=임의 문자열, _=한 글자. 대소문자 무시. 조건당 한 번만 컴파일. */
function buildLikeRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = "^" + escaped.replace(/%/g, ".*").replace(/_/g, ".") + "$";
  return new RegExp(regex, "i");
}
