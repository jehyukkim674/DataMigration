/** 오래 걸리는 작업(가져오기/내보내기/AI) 중 표시하는 로딩 오버레이. */
export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(255,255,255,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
          padding: "16px 22px", boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
          display: "flex", gap: 12, alignItems: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#2f7ae0" strokeWidth="5" strokeLinecap="round" strokeDasharray="80 50">
            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span style={{ fontSize: 14 }}>{message}</span>
      </div>
    </div>
  );
}
