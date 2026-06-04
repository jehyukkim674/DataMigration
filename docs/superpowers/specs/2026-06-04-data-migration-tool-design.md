# DataMigration — AI 데이터 정리 데스크톱 앱 설계

작성일: 2026-06-04

## 목적

Excel/CSV를 import 해서 데이터를 정리하는 데스크톱 앱. 엑셀 시트처럼 직접 편집하는 표가
메인 화면이고, 옆의 AI 패널에 자연어 명령을 내려 데이터 **합치기 / 쪼개기 / 컬럼 생성** 등의
변환을 수행한다. AI는 항상 **미리보기 후 적용** 방식으로 동작하며, 모든 변경은 되돌릴 수 있다.

## 핵심 요구사항

- Excel/CSV import, 정리 후 Excel/CSV export
- 엑셀식 컬럼별 직접 편집(셀 더블클릭 편집, 복붙)
- AI 명령으로 합치기 / 쪼개기 / 컬럼 생성 등 변환 — 미리보기 후 적용
- 수만~수십만 행을 **버벅임 없이** 로딩/편집 (가상화)
- 편집할 때마다 **되돌리기(Undo) 히스토리**
- 자동 업데이트 기능

## 기술 스택

`~/Dev/swagger-man`의 `apps/desktop` 구조와 자동 업데이터 설정을 차용한다.

- **Tauri 2** (Rust 백엔드) + **React 19** + **TypeScript** + **Vite**
- **glide-data-grid** — canvas 기반 가상화 그리드 (수백만 셀, 엑셀식 편집 내장)
- **react-resizable-panels** — 분할 패널 레이아웃
- **tauri-plugin-updater** — GitHub 릴리스 기반 자동 업데이트 (swagger-man 설정 차용)
- **Claude API** (Anthropic) — tool use로 구조화된 변환 명령 생성
- Rust: `calamine`(Excel 파싱), 빠른 CSV 파서

## 아키텍처: 접근 A — 하이브리드

데이터 처리 위치를 다음과 같이 나눈다.

- **Rust**: 파일 파싱/내보내기 담당. 대용량 Excel 파싱(JS SheetJS의 느림·메모리 병목)을
  `calamine`으로 해결하고, 컬럼형으로 프론트에 전달. export도 Rust가 수행.
- **프론트엔드(JS)**: 작업 데이터를 컬럼형 저장소(typed arrays)에 보관. 가상화 그리드로
  보이는 부분만 렌더링. **편집 / Undo / AI 변환은 모두 JS에서** 처리 → 편집 루프가 단순하고
  즉각 반응.
- 확장 경로: 백만 행 이상으로 커지면 처리를 Rust(Polars)로 이전.

### 설계 원칙: 모든 변경 = Operation

손으로 셀을 편집하든, AI가 컬럼을 쪼개든, **모든 데이터 변경은 단 하나의 `Operation` 경로**를
거친다. 그래서 Undo/Redo와 AI 미리보기가 동일한 메커니즘으로 동작한다.

## 모듈 구조

```
DataMigration/  (Tauri 2 앱)
├─ src-tauri/ (Rust)
│   ├─ commands/
│   │   ├─ import.rs      # Excel(calamine)/CSV 파싱 → 컬럼형으로 프론트에 전달
│   │   └─ export.rs      # 편집 완료된 데이터를 Excel/CSV로 저장
│   ├─ updater (tauri-plugin-updater)  # swagger-man 설정 차용
│   └─ main.rs
└─ src/ (React + TS)
    ├─ data/
    │   ├─ ColumnStore.ts     # 컬럼형(typed array) 데이터 보관 + 행/셀 접근
    │   └─ types.ts           # Column, CellValue, DataType 등
    ├─ ops/
    │   ├─ operations.ts      # Operation 타입(편집/합치기/쪼개기/컬럼생성/필터…)
    │   ├─ applyOperation.ts  # ColumnStore에 op 적용 (+역연산 생성)
    │   └─ history.ts         # Undo/Redo 스택
    ├─ ai/
    │   ├─ claudeClient.ts    # Claude API 호출 (tool use)
    │   ├─ tools.ts           # AI가 호출할 수 있는 Operation 스키마 정의
    │   └─ aiSession.ts       # 대화 + 제안된 op 미리보기 관리
    ├─ grid/
    │   └─ DataGrid.tsx       # glide-data-grid 가상화 편집 그리드
    ├─ views/
    │   ├─ RootView.tsx       # 패널 레이아웃(react-resizable-panels)
    │   ├─ Toolbar.tsx        # import/export/undo/redo
    │   └─ AIPanel.tsx        # AI 채팅 + 미리보기 적용/취소
    └─ App.tsx
```

## 데이터 저장소 & 그리드 (성능 핵심)

### ColumnStore (컬럼형 저장)

행 배열(`[{name, age}, ...]`)이 아니라 컬럼별 배열로 보관한다.

- 각 컬럼 = `{ id, name, type, values: 배열 }`. 숫자는 `Float64Array`, 문자열은 일반 배열 + 문자열 풀.
- 컬럼 단위 작업(합치기/쪼개기/생성)이 캐시 친화적이고 빠름. 수십만 행 전체 변환도 1초 이내.
- 행 삭제/정렬은 실제 배열을 옮기지 않고 **인덱스 벡터**(보이는 행 순서)로 처리 →
  정렬/필터가 가볍다.

### DataGrid (가상화 그리드)

- glide-data-grid: 화면에 보이는 행만 canvas 렌더링.
- 셀 더블클릭 → 편집 → 커밋 시 `editCell` Operation 발생.
- 컬럼 헤더: 이름 변경, 타입 표시, 우클릭 메뉴(쪼개기/복제/삭제/AI로 변환).

## Operation & Undo/Redo

모든 변경은 `Operation`으로 표현되고, 적용 시 **역연산(inverse)** 을 함께 만들어 히스토리에 쌓는다.

```ts
type Operation =
  | { kind: 'editCell'; col; row; value }
  | { kind: 'mergeColumns'; sources: colId[]; separator; newName }   // 합치기
  | { kind: 'splitColumn'; source: colId; by; into: name[] }         // 쪼개기
  | { kind: 'newColumn'; name; type; fill }                          // 컬럼 생성
  | { kind: 'deleteColumn'; col }
  | { kind: 'renameColumn'; col; name }
  | { kind: 'transformColumn'; col; expr }   // AI가 만든 행 단위 변환
  | { kind: 'batch'; ops: Operation[] }      // AI 한 번 = 여러 op 묶음
```

- `applyOperation(store, op)` → `{ 변경된 store, inverse }` 반환.
- **History**: `undoStack`, `redoStack` 두 개. 적용 시 inverse를 undoStack에 push, redoStack 비움.
  Undo는 inverse 실행 후 원본 op를 redoStack으로. (Ctrl+Z / Ctrl+Shift+Z)
- 대용량 안전장치:
  - 셀 단위 편집 → 가벼운 inverse(이전 값만 저장).
  - 컬럼 전체 변환 → **영향받은 컬럼만** 이전 스냅샷을 inverse로 보관(메모리 절약).
- 히스토리 패널에 변경 목록을 표시해 엑셀처럼 단계별로 되돌린다.

## AI 연동 (Claude, 미리보기 후 적용)

1. 사용자가 AI 패널에 자연어 입력: 예) *"이름 컬럼을 성/이름으로 쪼개줘"*
2. 현재 **스키마 + 샘플 몇 행**(전체 데이터 X — 토큰·프라이버시 절약)을 컨텍스트로 Claude에 전달.
3. Claude는 **tool use**로 `Operation` 스키마에 맞는 구조화된 op를 반환 (자유 텍스트 코드 실행 X → 안전).
4. 앱이 그 op를 적용한 **미리보기**를 그리드에 오버레이로 표시(바뀌는 셀 하이라이트).
5. 사용자가 **[적용] / [취소]**. 적용하면 일반 Operation처럼 히스토리에 들어가 Undo 가능.

- `transformColumn`의 `expr`은 임의 코드가 아니라 **화이트리스트된 함수 세트**(split, concat,
  regex extract, upper/lower, trim, 날짜 포맷, 값 매핑 등)로 제한 → 안전하게 실행.
- API 키는 OS 키체인(또는 Tauri 보안 저장소)에 저장, 설정 화면에서 입력.

## 에러 처리

- **Import**: 깨진 인코딩 / 혼합 타입 / 헤더 없음 감지 → 사용자에게 옵션 제시(인코딩 선택,
  헤더 행 지정). 실패해도 앱이 죽지 않는다.
- **AI**: 키 없음 / 네트워크 오류 / 잘못된 op 반환 시 명확한 메시지 + 재시도. op 검증 실패 시 적용 거부.

## 테스트

- `ops`(applyOperation + inverse)와 `ColumnStore`는 vitest 단위 테스트.
  핵심 불변식: **apply → undo == 원본**(왕복 불변식).
- AI `tools` 스키마 검증 테스트.
- import 파서는 샘플 파일(정상/깨진 인코딩/헤더 없음)로 테스트.

## YAGNI (초기 범위에서 제외)

- 여러 AI 제공자 동시 지원(초기엔 Claude만)
- 풀 Rust(Polars) 데이터 엔진(필요 시 확장)
- 클라우드 동기화, 멀티 윈도우, 협업
