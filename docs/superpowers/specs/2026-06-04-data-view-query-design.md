# DataMigration 데이터 뷰/쿼리 기능 설계

작성일: 2026-06-04

## 목적

엑셀/DB 쿼리처럼 데이터를 **원본 변경 없이** 탐색하는 비파괴 뷰 레이어를 추가한다.

- 컬럼 숨기기/보이기 (hide/show)
- 다중 컬럼 정렬 (ORDER BY 우선순위)
- 컬럼별 필터 + WHERE 같은 조건식 쿼리 (`나이 > 30 AND 도시 = "서울"`)

뷰 조작은 되돌리기(Undo) 히스토리와 **분리**된다. 데이터 변환(편집/머지/쪼개기 = Operation)은
원본을 바꾸고 되돌릴 수 있지만, 필터/정렬/숨김은 "보여주는 방식"만 바꾸므로 별도 `ViewState`로
관리한다.

## 아키텍처

기존 `ColumnStore`(원본, 불변) 위에 `ViewState`를 얹고, `computeView`가 화면에 그릴
**보이는 컬럼 목록 + 정렬·필터된 행 인덱스 배열**을 만든다. `DataGrid`는 이 결과만 보고 그린다.

```
ColumnStore(원본) ──┐
                    ├─ computeView ─→ { visibleColumns, rowOrder: number[] } ─→ DataGrid
ViewState ──────────┘
```

- `rowOrder[displayRow]` = 원본 행 인덱스. 그리드의 화면 행 → 원본 행 매핑.
- 셀 편집 시 `displayRow`를 `rowOrder`로 역매핑해 원본 행에 `editCell` Operation 적용.

## 데이터 구조

```ts
type SortDir = "asc" | "desc";
interface SortSpec { colId: string; dir: SortDir; }

type FilterOp =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "contains" | "startsWith" | "endsWith"
  | "empty" | "notEmpty";

interface FilterCondition {
  colId: string;
  op: FilterOp;
  value?: string | number; // empty/notEmpty는 value 없음
}

interface ViewState {
  hiddenColumns: string[];   // 숨긴 컬럼 id
  sorts: SortSpec[];         // 우선순위 순서(앞이 1순위)
  filters: FilterCondition[];// AND 결합(구조화 필터 UI)
  query: string;             // WHERE 같은 자유 쿼리 텍스트(있으면 filters와 AND)
}
```

## 모듈 구조

```
src/view/
  viewState.ts     # ViewState/FilterCondition/SortSpec 타입 + EMPTY_VIEW + 조작 헬퍼(불변)
  filter.ts        # evalCondition(value, op, target) + matchesRow(store, row, conditions)
  query.ts         # parseQuery(text, columns) → FilterCondition[] (WHERE 같은 파서)
  computeView.ts   # computeView(store, view) → { visibleColumns, rowOrder }
src/views/
  QueryBar.tsx     # WHERE 쿼리 입력 + 적용/초기화
  ColumnMenu.tsx   # 컬럼 헤더 메뉴: 정렬(asc/desc/해제), 숨기기
  ColumnVisibility.tsx # 숨긴 컬럼 다시 보이기 토글 목록
```

## 쿼리 문법 (WHERE 같은 자유 쿼리)

최소하지만 실용적인 파서:

- 조건: `<컬럼명> <연산자> <값>`
  - 연산자: `=`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `startsWith`, `endsWith`, `is empty`, `is not empty`
  - 값: 숫자(`30`), 따옴표 문자열(`"서울"`), 또는 따옴표 없는 단어(`서울`)
  - 컬럼명: 공백 없으면 그대로, 공백 있으면 따옴표(`"성과 이름"`)
- 결합: `AND`, `OR` (대소문자 무시). 괄호는 M2 범위 외(향후).
  - 단순화: 좌→우 평가, `AND`가 `OR`보다 우선(표준). 구현은 OR 묶음 of AND 묶음.
- 컬럼명이 실제 컬럼과 매칭 안 되면 파싱 에러를 반환해 사용자에게 표시(적용 안 함).

예: `나이 >= 30 AND 도시 = "서울" OR 도시 = "부산"`

## 정렬 / 필터 / 숨김 동작

- **정렬**: `sorts` 우선순위대로 안정 정렬. number 컬럼은 수치 비교, string은 로캘 문자열 비교.
  null/빈 값은 항상 마지막.
- **필터**: `filters`(AND) 와 `query`(파싱된 조건) 를 모두 만족하는 행만 `rowOrder`에 포함.
- **숨김**: `hiddenColumns`에 든 컬럼은 `visibleColumns`에서 제외(원본엔 남아있음).

## UI

- 컬럼 헤더 우클릭/메뉴 → 오름/내림차순 정렬, 정렬 해제, 컬럼 숨기기.
- 상단에 **쿼리 바**: WHERE 텍스트 입력 → Enter로 적용, 에러 시 메시지, "초기화" 버튼.
- 숨긴 컬럼이 있으면 툴바에 "숨긴 컬럼(N)" 버튼 → 체크 토글로 복원.
- 정렬/필터가 활성화되면 그 상태를 표시(헤더 화살표, 쿼리 바 강조). "뷰 초기화"로 전체 해제.

## 내보내기 연동

기존 `exportFileDialog`에 옵션 추가: "보이는 결과만 내보내기"(현재 `rowOrder`+`visibleColumns` 적용)
vs "전체 원본 내보내기". 기본은 보이는 결과.

## 테스트

- `filter.ts`: 각 연산자별 `evalCondition` 단위 테스트(숫자/문자/빈값).
- `query.ts`: 파서가 다양한 쿼리를 올바른 조건 배열로 변환, 잘못된 컬럼/문법은 에러.
- `computeView.ts`: 필터+정렬+숨김 조합이 올바른 `rowOrder`/`visibleColumns` 생성. 안정 정렬, null 처리.
- `viewState.ts`: 불변 조작 헬퍼(토글 정렬, 숨김 추가/제거).

## YAGNI (이번 범위 제외)

- 괄호 그룹 / 복잡한 연산자 우선순위
- 그룹화(GROUP BY)/집계
- 저장된 뷰(프리셋)
- 가상 컬럼(계산식) — 이는 Operation(newColumn)으로 이미 가능
