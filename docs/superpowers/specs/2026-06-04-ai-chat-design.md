# DataMigration AI 채팅 설계 (CLI 기반, 키 없음)

작성일: 2026-06-04

## 목적

우측 패널의 채팅창에서 자연어로 데이터를 다룬다. "이름 쪼개줘", "나이 30 이상만 보여줘"
같은 요청을 AI가 구조화된 명령으로 바꿔 **미리보기 후 적용**한다.

## 핵심 결정: API 키 없이 Claude CLI 사용

Anthropic API 키 대신, 사용자의 기존 Claude Code 인증을 그대로 쓰는 **`claude` CLI**를
Rust 백엔드가 서브프로세스로 호출한다.

검증된 호출:
```
claude -p "<프롬프트>" --output-format json --json-schema '<스키마>' --model <모델>
```
표준출력(JSON)에서:
- `.structured_output` — 스키마에 맞는 구조화 명령(우리가 파싱)
- `.result` — 사람이 읽는 설명 메시지
- `.total_cost_usd`, `.usage` — 비용/토큰(표시용)

장점: 키 관리 불필요, CORS 없음. 단점: 사용자 머신에 `claude` CLI 필요(개인용이므로 OK).
기본 모델은 비용 절감을 위해 가벼운 모델(`claude-haiku-4-5`), 설정에서 변경 가능.

## 아키텍처

```
AIPanel(채팅) ──요청──→ aiClient ──invoke──→ Rust ai_command
                                                  │ claude CLI 서브프로세스 실행
                                                  ↓
                          { commands: Command[], message } ←─ structured_output/.result
AIPanel ←──미리보기/적용── mapCommand → Operation(apply, 되돌리기 가능) 또는 ViewState(setView)
```

### Rust: `claude` 실행 경로 탐색

GUI 앱은 셸 PATH를 상속하지 않으므로 다음 순서로 `claude`를 찾는다:
1. 설정에 저장된 사용자 지정 경로(있으면)
2. `PATH` 환경변수
3. 알려진 위치: `~/.claude/local/claude`, `/opt/homebrew/bin/claude`,
   `/usr/local/bin/claude`, `/Applications/cmux.app/Contents/Resources/bin/claude`
찾지 못하면 명확한 안내 메시지 반환(설정에서 경로 지정 유도).

## 명령 스키마 (json-schema)

AI는 한 번에 여러 명령을 낼 수 있다(`commands` 배열). 각 명령은 데이터 변환 또는 뷰 조작.

```jsonc
{
  "type": "object",
  "properties": {
    "commands": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "action": { "type": "string", "enum": [
            "editCell","mergeColumns","splitColumn","newColumn","deleteColumn","renameColumn",
            "filter","sort","hideColumn","clearView"
          ]},
          "columnName": { "type": "string" },        // 대상 컬럼(이름)
          "columnNames": { "type": "array", "items": {"type":"string"} }, // 머지 등 다중
          "newColumnName": { "type": "string" },
          "separator": { "type": "string" },
          "op": { "type": "string" },                // filter 연산자(=,>,contains 등)
          "value": { "type": "string" },             // filter 값 / editCell 값
          "direction": { "type": "string", "enum": ["asc","desc"] },
          "row": { "type": "integer" }               // editCell 행(0-base)
        },
        "required": ["action"]
      }
    },
    "reply": { "type": "string" }  // 사용자에게 보여줄 한국어 설명
  },
  "required": ["commands"]
}
```

프론트의 `mapCommand`가 컬럼명→colId 변환 후 각 command를 다음으로 매핑:
- 변환 계열(editCell/mergeColumns/splitColumn/newColumn/deleteColumn/renameColumn) → `Operation`
  → `history.apply`(되돌리기 가능)
- 뷰 계열(filter/sort/hideColumn/clearView) → `ViewState` 변경 → `setView`

## 프롬프트 구성

매 요청마다 다음을 프롬프트에 포함(전체 데이터 X — 토큰/프라이버시):
- 컬럼 목록(이름, 타입)
- 샘플 최대 5행
- 현재 활성 뷰 요약(필터/정렬/숨김)
- 사용자 자연어 요청
- 지시: "위 스키마의 commands로만 응답. 컬럼은 정확한 이름으로. 불명확하면 reply로 되물어라."

## 미리보기 후 적용

M2 1차 구현:
- AI 응답 도착 → 채팅에 `reply` + 제안된 commands 요약 표시 + **[적용]/[취소]** 버튼.
- [적용]: 변환은 `history.apply`(되돌리기 가능), 뷰는 `setView`(즉시) 실행.
- 변환은 되돌리기로 안전하게 취소 가능하므로 1차 미리보기는 "요약 + 적용/취소"로 단순화.
- (향후) 셀 단위 diff 하이라이트 미리보기.

## 모듈 구조

```
src-tauri/src/
  ai.rs               # ai_command 커맨드: claude 경로 탐색 + 서브프로세스 호출 + JSON 파싱
src/ai/
  commandSchema.ts    # json-schema 문자열 + Command 타입
  aiClient.ts         # invoke('ai_command', ...) 래퍼 + 프롬프트 빌더
  mapCommand.ts       # Command[] → { ops: Operation[], viewUpdates, errors }
  AIPanel.tsx         # 채팅 UI(메시지/입력/적용·취소)
```

## 에러 처리

- `claude` 미발견 → 설정에서 경로 지정 안내.
- CLI 비정상 종료/타임아웃(예: 60s) → 메시지 표시.
- `structured_output` 없음/스키마 불일치 → `.result`만 표시하고 적용 비활성.
- 알 수 없는 컬럼명 → mapCommand가 에러로 표시, 해당 command 건너뜀.

## 테스트

- `mapCommand`(순수): 각 action → 올바른 Operation/ViewState 변경, 잘못된 컬럼 처리. vitest.
- `commandSchema`: 스키마 JSON 유효성.
- Rust `ai.rs`: 경로 탐색 로직 단위 테스트(존재하는 더미 경로 우선순위). 실제 CLI 호출은
  통합 영역이라 단위테스트에서 제외.
- AIPanel/aiClient: Tauri 런타임 의존 → 수동 확인.

## YAGNI (이번 범위 제외)

- 셀 단위 diff 미리보기(요약+적용/취소로 대체)
- 멀티턴 대화 메모리(요청마다 컨텍스트 새로 구성; 직전 reply 정도만)
- 스트리밍 출력
- 모델 자동 선택/가격 최적화(기본 haiku, 설정에서 변경)
