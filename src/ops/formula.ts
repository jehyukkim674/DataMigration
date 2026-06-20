// 쪼개기 수식 엔진: 함수 호출 기반의 작은 식 언어(안전, eval 미사용).
// 변수: value(원본), p0,p1,...(조각). 모든 값은 문자열로 다룬다.
// 예: if(contains(value, "LTS"), "", p2)   /   extract(value, "([0-9.]+)", 1)

export interface FormulaVars {
  value: string;
  parts: string[];
}

type Node =
  | { t: "lit"; v: string }
  | { t: "id"; name: string }
  | { t: "call"; name: string; args: Node[] };

interface Token {
  k: "id" | "str" | "num" | "(" | ")" | ",";
  v: string;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c === "(" || c === ")" || c === ",") { tokens.push({ k: c, v: c }); i++; continue; }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\" && j + 1 < src.length) { s += src[j + 1]; j += 2; }
        else { s += src[j]; j++; }
      }
      tokens.push({ k: "str", v: s });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "-" && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ k: "num", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ k: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`알 수 없는 문자: ${c}`);
  }
  return tokens;
}

function parse(tokens: Token[]): Node {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];

  function parseExpr(): Node {
    const t = peek();
    if (!t) throw new Error("식이 비어있음");
    if (t.k === "str") { eat(); return { t: "lit", v: t.v }; }
    if (t.k === "num") { eat(); return { t: "lit", v: t.v }; }
    if (t.k === "id") {
      eat();
      if (peek()?.k === "(") {
        eat(); // (
        const args: Node[] = [];
        if (peek()?.k !== ")") {
          args.push(parseExpr());
          while (peek()?.k === ",") { eat(); args.push(parseExpr()); }
        }
        if (peek()?.k !== ")") throw new Error("괄호가 닫히지 않음");
        eat(); // )
        return { t: "call", name: t.v, args };
      }
      return { t: "id", name: t.v };
    }
    throw new Error(`예상치 못한 토큰: ${t.v}`);
  }

  const node = parseExpr();
  if (pos !== tokens.length) throw new Error("식 뒤에 불필요한 토큰");
  return node;
}

function truthy(s: string): boolean {
  return s !== "" && s !== "false" && s !== "0";
}
function num(s: string): number {
  return Number(s);
}

function evalNode(node: Node, vars: FormulaVars, bindings: Record<string, string>): string {
  if (node.t === "lit") return node.v;
  if (node.t === "id") {
    if (node.name in bindings) return bindings[node.name];
    if (node.name === "value") return vars.value;
    const m = node.name.match(/^p(\d+)$/);
    if (m) return vars.parts[Number(m[1])] ?? "";
    return "";
  }
  // call
  const a = (i: number) => evalNode(node.args[i], vars, bindings);
  switch (node.name) {
    case "if": return truthy(a(0)) ? a(1) : (node.args[2] ? a(2) : "");
    case "not": return truthy(a(0)) ? "" : "true";
    case "and": return node.args.every((_, i) => truthy(a(i))) ? "true" : "";
    case "or": return node.args.some((_, i) => truthy(a(i))) ? "true" : "";
    case "eq": return a(0) === a(1) ? "true" : "";
    case "ne": return a(0) !== a(1) ? "true" : "";
    case "gt": return num(a(0)) > num(a(1)) ? "true" : "";
    case "lt": return num(a(0)) < num(a(1)) ? "true" : "";
    case "gte": return num(a(0)) >= num(a(1)) ? "true" : "";
    case "lte": return num(a(0)) <= num(a(1)) ? "true" : "";
    case "contains": return a(0).includes(a(1)) ? "true" : "";
    case "startsWith": return a(0).startsWith(a(1)) ? "true" : "";
    case "endsWith": return a(0).endsWith(a(1)) ? "true" : "";
    case "matches": try { return new RegExp(a(1)).test(a(0)) ? "true" : ""; } catch { return ""; }
    case "extract": {
      try {
        const mm = a(0).match(new RegExp(a(1)));
        const g = node.args[2] ? Math.trunc(num(a(2))) : 0;
        return mm && mm[g] != null ? mm[g] : "";
      } catch { return ""; }
    }
    case "replace": return a(0).split(a(1)).join(a(2) ?? "");
    case "concat": return node.args.map((_, i) => a(i)).join("");
    case "upper": return a(0).toUpperCase();
    case "lower": return a(0).toLowerCase();
    case "trim": return a(0).trim();
    case "len": return String(a(0).length);
    case "substr": {
      const s = a(0);
      const start = Math.trunc(num(a(1)));
      if (node.args[2]) {
        const len = Math.trunc(num(a(2)));
        const from = start < 0 ? Math.max(0, s.length + start) : start;
        return s.slice(from, from + Math.max(0, len));
      }
      return s.slice(start);
    }
    case "padStart": return a(0).padStart(Math.max(0, Math.trunc(num(a(1)))), node.args[2] ? a(2) || " " : " ");
    case "padEnd": return a(0).padEnd(Math.max(0, Math.trunc(num(a(1)))), node.args[2] ? a(2) || " " : " ");
    case "repeat": return a(0).repeat(Math.min(10000, Math.max(0, Math.trunc(num(a(1))))));
    case "coalesce": {
      for (let i = 0; i < node.args.length; i++) { const v = a(i); if (v !== "") return v; }
      return "";
    }
    default: throw new Error(`알 수 없는 함수: ${node.name}`);
  }
}

/** `이름 = 식` 형태의 변수 지정 줄인지 검사. value/pN은 변수명으로 못 씀. */
function parseAssignment(line: string): { name: string; expr: string } | null {
  const m = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/s);
  if (!m) return null;
  if (m[1] === "value" || /^p\d+$/.test(m[1])) return null;
  return { name: m[1], expr: m[2] };
}

function evalExpr(src: string, vars: FormulaVars, bindings: Record<string, string>): string {
  return evalNode(parse(tokenize(src)), vars, bindings);
}

/**
 * 수식 평가(여러 줄 지원). 각 줄이 `이름 = 식`이면 변수 지정(이후 줄에서 사용),
 * 그 외 줄은 결과 식으로 취급(마지막 결과 식이 최종 값). 오류 시 빈 문자열.
 */
export function evalFormula(src: string, vars: FormulaVars): string {
  const lines = src.split(/\n/).map((l) => l.trim()).filter((l) => l !== "");
  if (lines.length === 0) return "";
  try {
    const bindings: Record<string, string> = {};
    let result = "";
    for (const line of lines) {
      const asn = parseAssignment(line);
      if (asn) bindings[asn.name] = evalExpr(asn.expr, vars, bindings);
      else result = evalExpr(line, vars, bindings);
    }
    return result;
  } catch {
    return "";
  }
}

/** 수식이 문법적으로 유효한지(미리보기 에러 표시용). 여러 줄 각각 검사. */
export function validateFormula(src: string): string | null {
  const lines = src.split(/\n/).map((l) => l.trim()).filter((l) => l !== "");
  if (lines.length === 0) return null;
  try {
    let hasResult = false;
    for (const line of lines) {
      const asn = parseAssignment(line);
      parse(tokenize(asn ? asn.expr : line));
      if (!asn) hasResult = true;
    }
    if (!hasResult) return "결과 식이 필요합니다";
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "수식 오류";
  }
}
