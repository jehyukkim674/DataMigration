import type { FilterCondition, FilterOp } from "./viewState";

export type ParseResult =
  | { ok: true; groups: FilterCondition[][] }
  | { ok: false; error: string };

interface ColRef {
  id: string;
  name: string;
  alias?: string;
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
  like: "like",
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

  // <col> <op> <value> — 기호 연산자는 공백 선택, 단어 연산자(contains/like 등)는 공백 필수.
  const m = text.match(
    /^(.+?)(?:\s*(>=|<=|!=|==|=|>|<)\s*|\s+(contains|startsWith|endsWith|like)\s+)(.+)$/i,
  );
  if (!m) return `문법 오류: ${text}`;
  const opToken = m[2] ?? m[3];
  const col = findCol(m[1], cols);
  if (!col) return `알 수 없는 컬럼: ${m[1].trim()}`;
  const op = OP_MAP[opToken.toLowerCase()];
  if (!op) return `알 수 없는 연산자: ${opToken}`;
  const value = parseValue(m[4]);
  if (value === undefined) return `빈 값: ${text}`;
  return { colId: col.id, op, value };
}

function findCol(raw: string, cols: ColRef[]): ColRef | undefined {
  const name = raw.trim().replace(/^"|"$/g, "").trim();
  return cols.find((c) => c.name === name || c.alias === name);
}

function parseValue(raw: string): string | number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  if (/^".*"$/.test(t)) return t.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

export function parseQuery(text: string, cols: ColRef[]): ParseResult {
  // macOS 스마트 따옴표(“ ” ‘ ’)를 일반 따옴표로 정규화(입력기 자동변환 방어).
  const trimmed = text
    .replace(/[“”„‟«»]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .trim();
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
