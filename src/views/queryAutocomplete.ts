export interface Suggestion {
  text: string;
  insert: string;
}

const OPERATORS = [
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "contains",
  "startsWith",
  "endsWith",
  "like",
  "is empty",
  "is not empty",
] as const;

const LOGIC = ["AND", "OR"] as const;

const MAX_RESULTS = 8;

/** 연산자로 인정되는 토큰인지 판단한다. (`is`는 `is empty`/`is not empty`의 시작) */
function isOperatorToken(token: string): boolean {
  const t = token.toLowerCase();
  return (
    t === "=" ||
    t === "!=" ||
    t === ">" ||
    t === ">=" ||
    t === "<" ||
    t === "<=" ||
    t === "contains" ||
    t === "startswith" ||
    t === "endswith" ||
    t === "like" ||
    t === "is"
  );
}

/** 마지막 최상위 ` AND ` / ` OR ` 이후의 현재 절을 추출한다. */
function currentClause(textBeforeToken: string): string {
  // 대소문자 무시하고 AND/OR 구분자를 찾는다.
  const re = /\s(?:and|or)\s/gi;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(textBeforeToken)) !== null) {
    lastEnd = m.index + m[0].length;
  }
  return textBeforeToken.slice(lastEnd);
}

/** 절을 토큰으로 분해한다. `"..."`는 하나의 토큰으로 취급. */
function tokenize(clause: string): string[] {
  return clause.match(/"[^"]*"|\S+/g) ?? [];
}

function quoteIfNeeded(name: string): string {
  return /\s/.test(name) ? `"${name}"` : name;
}

export function getSuggestions(
  textBeforeToken: string,
  token: string,
  columns: string[],
): Suggestion[] {
  const clause = currentClause(textBeforeToken);
  const tokens = tokenize(clause);
  const n = tokens.length;

  let kind: "COLUMN" | "OPERATOR" | "LOGIC";
  if (n === 0) {
    kind = "COLUMN";
  } else if (n === 1) {
    kind = "OPERATOR";
  } else {
    kind = tokens.some(isOperatorToken) ? "LOGIC" : "OPERATOR";
  }

  const t = token.trim().toLowerCase();

  if (kind === "COLUMN") {
    const matched = columns.filter((c) => {
      const lc = c.toLowerCase();
      if (t === "") return true;
      return lc.includes(t) && lc !== t;
    });
    return matched
      .slice(0, MAX_RESULTS)
      .map((c) => ({ text: c, insert: `${quoteIfNeeded(c)} ` }));
  }

  if (kind === "OPERATOR") {
    // 연산자 전체 문법은 토큰이 비어도 모두 제시한다. (사양 테스트가 like까지 요구)
    const matched = OPERATORS.filter((op) =>
      t === "" ? true : op.toLowerCase().includes(t),
    );
    return matched.map((op) => ({ text: op, insert: `${op} ` }));
  }

  // LOGIC
  const matched = LOGIC.filter((w) =>
    t === "" ? true : w.toLowerCase().includes(t),
  );
  return matched.map((w) => ({ text: w, insert: `${w} ` }));
}
