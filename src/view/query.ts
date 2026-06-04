import type { FilterCondition, FilterOp } from "./viewState";

export type ParseResult =
  | { ok: true; groups: FilterCondition[][] }
  | { ok: false; error: string };

interface ColRef {
  id: string;
  name: string;
}

const OP_MAP: Record<string, FilterOp> = {
  "=": "eq",
  "==": "eq",
  "!=": "neq",
  ">": "gt",
  ">=": "gte",
  "<": "lt",
  "<=": "lte",
  contains: "contains",
  startswith: "startsWith",
  endswith: "endsWith",
};

/** 한 조건 문자열을 FilterCondition으로. 실패 시 에러 메시지(string) 반환. */
function parseCondition(raw: string, cols: ColRef[]): FilterCondition | string {
  const text = raw.trim();
  if (text === "") return "빈 조건";

  // "is empty" / "is not empty"
  const emptyMatch = text.match(/^(.+?)\s+is\s+(not\s+)?empty$/i);
  if (emptyMatch) {
    const col = findCol(emptyMatch[1], cols);
    if (!col) return `알 수 없는 컬럼: ${emptyMatch[1].trim()}`;
    return { colId: col.id, op: emptyMatch[2] ? "notEmpty" : "empty" };
  }

  // <col> <op> <value>
  const m = text.match(
    /^(.+?)\s*(>=|<=|!=|==|=|>|<|contains|startsWith|endsWith)\s*(.+)$/i,
  );
  if (!m) return `문법 오류: ${text}`;
  const col = findCol(m[1], cols);
  if (!col) return `알 수 없는 컬럼: ${m[1].trim()}`;
  const op = OP_MAP[m[2].toLowerCase()];
  if (!op) return `알 수 없는 연산자: ${m[2]}`;
  const value = parseValue(m[3]);
  if (value === undefined) return `빈 값: ${text}`;
  return { colId: col.id, op, value };
}

function findCol(raw: string, cols: ColRef[]): ColRef | undefined {
  const name = raw.trim().replace(/^"|"$/g, "").trim();
  return cols.find((c) => c.name === name);
}

function parseValue(raw: string): string | number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  if (/^".*"$/.test(t)) return t.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

export function parseQuery(text: string, cols: ColRef[]): ParseResult {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, groups: [] };

  const orParts = trimmed.split(/\s+OR\s+/i);
  const groups: FilterCondition[][] = [];
  for (const orPart of orParts) {
    const andParts = orPart.split(/\s+AND\s+/i);
    const group: FilterCondition[] = [];
    for (const andPart of andParts) {
      const cond = parseCondition(andPart, cols);
      if (typeof cond === "string") return { ok: false, error: cond };
      group.push(cond);
    }
    groups.push(group);
  }
  return { ok: true, groups };
}
