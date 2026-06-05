import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { checkUpdateStatus, type UpdateCheck } from "../core/updater";
import { logError } from "../core/log";

interface Props {
  onClose: () => void;
}

type Phase =
  | { k: "checking" }
  | { k: "latest"; cur: string }
  | { k: "available"; cur: string; version: string; notes?: string }
  | { k: "downloading"; percent: number }
  | { k: "error"; message: string };

export function UpdateDialog({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ k: "checking" });
  const checkedRef = useRef<UpdateCheck | null>(null);

  useEffect(() => {
    let alive = true;
    checkUpdateStatus()
      .then((r) => {
        if (!alive) return;
        checkedRef.current = r;
        if (r.kind === "latest") setPhase({ k: "latest", cur: r.currentVersion });
        else if (r.kind === "available") setPhase({ k: "available", cur: r.currentVersion, version: r.update.version, notes: r.update.notes });
        else setPhase({ k: "error", message: r.message });
      })
      .catch((e) => { if (alive) setPhase({ k: "error", message: e instanceof Error ? e.message : String(e) }); });
    return () => { alive = false; };
  }, []);

  const startUpdate = async () => {
    const r = checkedRef.current;
    if (!r || r.kind !== "available") return;
    setPhase({ k: "downloading", percent: 0 });
    try {
      await r.update.install((percent) => setPhase({ k: "downloading", percent }));
      // 설치 완료 후 relaunch가 호출되어 앱이 재시작됨.
    } catch (e) {
      logError("updateInstall", e);
      setPhase({ k: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  const downloading = phase.k === "downloading";
  const btn: React.CSSProperties = { padding: "7px 16px", fontSize: 13, background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer" };

  return createPortal(
    <div onMouseDown={downloading ? undefined : onClose} style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(440px, 92vw)", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#4a6fa5", color: "#fff", fontWeight: 600 }}>업데이트</div>
        <div style={{ padding: 18, fontSize: 14, color: "#333", minHeight: 80 }}>
          {phase.k === "checking" && (
            <>
              <div style={{ marginBottom: 12, color: "#555" }}>최신 버전 확인 중…</div>
              <Bar indeterminate />
            </>
          )}

          {phase.k === "latest" && (
            <div>이미 최신 버전입니다. {phase.cur && <span style={{ color: "#888" }}>(v{phase.cur})</span>}</div>
          )}

          {phase.k === "available" && (
            <>
              <div style={{ marginBottom: 8 }}>
                새 버전 <b style={{ color: "#2f6fed" }}>v{phase.version}</b> 이(가) 있습니다.
                {phase.cur && <span style={{ color: "#888" }}> (현재 v{phase.cur})</span>}
              </div>
              {phase.notes && (
                <div style={{ maxHeight: 160, overflow: "auto", background: "#f7f8fa", border: "1px solid #eee", borderRadius: 6, padding: 10, fontSize: 12, color: "#555", whiteSpace: "pre-wrap" }}>{phase.notes}</div>
              )}
              <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>지금 업데이트할까요?</div>
            </>
          )}

          {phase.k === "downloading" && (
            <>
              <div style={{ marginBottom: 12, color: "#555" }}>다운로드 중… {phase.percent}%</div>
              <Bar percent={phase.percent} />
              <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>완료되면 앱이 자동으로 재시작됩니다.</div>
            </>
          )}

          {phase.k === "error" && (
            <div style={{ color: "#c0392b" }}>업데이트 확인 실패: {phase.message}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 16px", borderTop: "1px solid #eee" }}>
          {phase.k === "available" ? (
            <>
              <button style={btn} onClick={onClose}>나중에</button>
              <button style={{ ...btn, background: "#2f7ae0", color: "#fff", border: "none", fontWeight: 600 }} onClick={() => void startUpdate()}>지금 업데이트</button>
            </>
          ) : (
            <button style={btn} onClick={onClose} disabled={downloading}>{downloading ? "진행 중…" : "닫기"}</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Bar({ percent, indeterminate }: { percent?: number; indeterminate?: boolean }) {
  return (
    <div style={{ height: 8, borderRadius: 6, background: "#eef0f3", overflow: "hidden", position: "relative" }}>
      {indeterminate ? (
        <div style={{ position: "absolute", height: "100%", width: "40%", borderRadius: 6, background: "#2f7ae0", animation: "dm-indeterminate 1.1s ease-in-out infinite" }} />
      ) : (
        <div style={{ height: "100%", width: `${percent ?? 0}%`, borderRadius: 6, background: "#2f7ae0", transition: "width 0.2s ease" }} />
      )}
    </div>
  );
}
