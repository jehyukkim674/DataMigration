import type { ColumnStore } from "../data/ColumnStore";

interface Props {
  store: ColumnStore;
  hidden: string[];
  onToggle: (colId: string) => void;
}

export function ColumnVisibility({ store, hidden, onToggle }: Props) {
  if (hidden.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "#888" }}>숨긴 컬럼:</span>
      {hidden.map((id) => {
        const name = store.columns.find((c) => c.id === id)?.name ?? id;
        return (
          <button key={id} onClick={() => onToggle(id)} title="다시 보이기">
            {name} ✕
          </button>
        );
      })}
    </div>
  );
}
