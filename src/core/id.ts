// 충돌 없는 짧은 고유 id 생성. Date.now() 단독은 같은 ms에 충돌할 수 있어
// 단조 증가 카운터를 함께 써서 한 세션 내 유일성을 보장한다.
let counter = 0;

/** `<prefix>_<시각36진수>_<카운터36진수>` 형식의 고유 id. */
export function genId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;
}
