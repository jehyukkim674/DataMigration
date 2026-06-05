import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColumnStore } from "../data/ColumnStore";
import { ColumnSettings } from "./ColumnSettings";
import { ColumnMenu } from "./ColumnMenu";
import { ReplaceDialog } from "./ReplaceDialog";
import { SplitDialog } from "./SplitDialog";
import { NewColumnDialog } from "./NewColumnDialog";

const store = ColumnStore.fromRows(
  [{ id: "c0", name: "이름", type: "string" }, { id: "c1", name: "도시", type: "string" }],
  [["Kim Lee", "서울특별시"], ["Park Choi", "부산광역시"]],
);

test("ColumnSettings: 체크 토글 + 적용", () => {
  const onApply = vi.fn();
  render(<ColumnSettings allColumns={[{ id: "c0", name: "이름" }, { id: "c1", name: "도시" }]} order={["c0", "c1"]} hidden={[]} store={store} aliases={{}} onApply={onApply} onClose={vi.fn()} />);
  fireEvent.click(screen.getByText("전체 해제"));
  fireEvent.click(screen.getByText("적용"));
  expect(onApply).toHaveBeenCalled();
  const [, hidden] = onApply.mock.calls[0];
  expect(hidden).toEqual(["c0", "c1"]); // 전체 해제 → 모두 숨김
});

test("ColumnMenu: 오름차순 정렬 콜백", () => {
  const onSort = vi.fn();
  render(
    <ColumnMenu
      colId="c0" colName="이름" pos={{ x: 10, y: 10 }} uniqueValues={[{ value: "Kim Lee", count: 2 }, { value: "Park Choi", count: 1 }]}
      onSort={onSort} onHide={vi.fn()} onSplit={vi.fn()} onReplace={vi.fn()} onDelete={vi.fn()} onFilter={vi.fn()} onClose={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByText("↑ 오름"));
  expect(onSort).toHaveBeenCalledWith("asc");
});

test("ColumnMenu: 값 선택 필터 + 컬럼 삭제", () => {
  const onFilter = vi.fn();
  const onDelete = vi.fn();
  render(
    <ColumnMenu
      colId="c1" colName="도시" pos={{ x: 0, y: 0 }} uniqueValues={[{ value: "서울특별시", count: 3 }, { value: "부산광역시", count: 1 }]}
      onSort={vi.fn()} onHide={vi.fn()} onSplit={vi.fn()} onReplace={vi.fn()} onDelete={onDelete} onFilter={onFilter} onClose={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByText("🗑 컬럼 삭제"));
  expect(onDelete).toHaveBeenCalled();
});

test("ReplaceDialog: 찾기 입력 후 모두 바꾸기", () => {
  const onApply = vi.fn();
  render(<ReplaceDialog store={store} colId="c1" onApply={onApply} onClose={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText("찾을 텍스트"), { target: { value: "광역시" } });
  fireEvent.click(screen.getByText(/모두 바꾸기/));
  expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ kind: "replaceInColumn", colId: "c1", find: "광역시" }));
});

test("NewColumnDialog: 두 컬럼 비교 → compareColumns 연산", () => {
  const onApply = vi.fn();
  render(<NewColumnDialog store={store} onApply={onApply} onClose={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText("컬럼 이름"), { target: { value: "정합성" } });
  // 기본이 '두 컬럼 비교' 모드
  fireEvent.click(screen.getByText("생성"));
  expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ kind: "compareColumns", name: "정합성" }));
});

test("NewColumnDialog: 고정 값 → newColumn 연산", () => {
  const onApply = vi.fn();
  render(<NewColumnDialog store={store} onApply={onApply} onClose={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText("컬럼 이름"), { target: { value: "메모" } });
  fireEvent.click(screen.getByText("고정 값"));
  fireEvent.change(screen.getByPlaceholderText("(비우면 빈 값)"), { target: { value: "기본" } });
  fireEvent.click(screen.getByText("생성"));
  expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ kind: "newColumn", name: "메모", fillValue: "기본" }));
});

test("SplitDialog: 적용 시 formulaColumns 연산", () => {
  const onApply = vi.fn();
  render(<SplitDialog store={store} initialColId="c0" onApply={onApply} onClose={vi.fn()} />);
  fireEvent.click(screen.getByText("적용"));
  expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ kind: "formulaColumns", sourceId: "c0" }));
});

test("SplitDialog: 모드 전환 + 수식 사용 토글", () => {
  render(<SplitDialog store={store} initialColId="c0" onApply={vi.fn()} onClose={vi.fn()} />);
  fireEvent.click(screen.getByText("정규식 캡처"));
  fireEvent.click(screen.getByLabelText(/수식 사용/) || screen.getByText(/수식 사용/));
  // 수식 사용 시 편집기 버튼 노출
  expect(screen.getAllByText("✎ 편집기").length).toBeGreaterThan(0);
});

test("ColumnMenu: 조건 필터 적용", () => {
  const onFilter = vi.fn();
  render(
    <ColumnMenu
      colId="c1" colName="도시" pos={{ x: 0, y: 0 }} uniqueValues={[{ value: "서울특별시", count: 3 }, { value: "부산광역시", count: 1 }]}
      onSort={vi.fn()} onHide={vi.fn()} onSplit={vi.fn()} onReplace={vi.fn()} onDelete={vi.fn()} onFilter={onFilter} onClose={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByPlaceholderText("값"), { target: { value: "서울" } });
  fireEvent.click(screen.getByText("조건 적용"));
  expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ colId: "c1", op: "contains", value: "서울" }));
});

test("ColumnMenu: 값 선택 필터", () => {
  const onFilter = vi.fn();
  render(
    <ColumnMenu
      colId="c1" colName="도시" pos={{ x: 0, y: 0 }} uniqueValues={[{ value: "서울특별시", count: 3 }, { value: "부산광역시", count: 1 }]}
      onSort={vi.fn()} onHide={vi.fn()} onSplit={vi.fn()} onReplace={vi.fn()} onDelete={vi.fn()} onFilter={onFilter} onClose={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByText("전체"));
  fireEvent.click(screen.getByText(/선택값으로 필터/));
  expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ colId: "c1", op: "in" }));
});

test("ColumnSettings: 개별 체크박스 토글로 숨김", () => {
  const onApply = vi.fn();
  render(<ColumnSettings allColumns={[{ id: "c0", name: "이름" }, { id: "c1", name: "도시" }]} order={["c0", "c1"]} hidden={[]} store={store} aliases={{}} onApply={onApply} onClose={vi.fn()} />);
  const checks = screen.getAllByRole("checkbox");
  fireEvent.click(checks[0]); // 이름 숨김
  fireEvent.click(screen.getByText("적용"));
  const [, hidden] = onApply.mock.calls[0];
  expect(hidden).toContain("c0");
});

test("ColumnSettings: 별칭 입력 + ↓ 순서변경 → onApply 반영", () => {
  const onApply = vi.fn();
  render(<ColumnSettings allColumns={[{ id: "c0", name: "이름" }, { id: "c1", name: "도시" }]} order={["c0", "c1"]} hidden={[]} store={store} aliases={{}} onApply={onApply} onClose={vi.fn()} />);
  const aliasInput = screen.getAllByPlaceholderText(/별칭/)[0];
  fireEvent.change(aliasInput, { target: { value: "성명" } });
  fireEvent.blur(aliasInput); // 입력 커밋(실제 앱은 적용 클릭 시 input이 blur되어 커밋됨)
  fireEvent.click(screen.getAllByTitle("아래로")[0]); // c0를 아래로
  fireEvent.click(screen.getByText("적용"));
  const [order, , aliases] = onApply.mock.calls[0];
  expect(order).toEqual(["c1", "c0"]);
  expect(aliases).toEqual({ c0: "성명" });
});

test("ColumnSettings: 고유값만/정렬/접기 미리보기", () => {
  const s2 = ColumnStore.fromRows(
    [{ id: "c0", name: "도시", type: "string" }],
    [["서울"], ["부산"], ["서울"], ["대구"]],
  );
  render(<ColumnSettings allColumns={[{ id: "c0", name: "도시" }]} order={["c0"]} hidden={[]} store={s2} aliases={{}} onApply={vi.fn()} onClose={vi.fn()} />);
  // 원본: 4개 표시(중복 포함)
  expect(screen.getAllByText("서울").length).toBe(2);
  // 고유값만 → 서울 1개
  fireEvent.click(screen.getByText(/고유값만/).querySelector("input")!);
  expect(screen.getAllByText("서울").length).toBe(1);
  // 정렬 토글 동작(에러 없이)
  fireEvent.click(screen.getByText(/정렬/));
  expect(screen.getByText(/컬럼 설정/)).toBeTruthy();
});

test("ColumnSettings: 초기화 + 개별 토글", () => {
  const onApply = vi.fn();
  render(<ColumnSettings allColumns={[{ id: "c0", name: "이름" }, { id: "c1", name: "도시" }]} order={["c1", "c0"]} hidden={["c0"]} store={store} aliases={{}} onApply={onApply} onClose={vi.fn()} />);
  fireEvent.click(screen.getByText("초기화")); // 순서/숨김 리셋
  fireEvent.click(screen.getByText("적용"));
  const [order, hidden] = onApply.mock.calls[0];
  expect(order).toEqual(["c0", "c1"]);
  expect(hidden).toEqual([]);
});
