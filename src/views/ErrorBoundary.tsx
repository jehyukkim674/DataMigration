import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** 렌더링 중 예외가 나도 앱이 흰 화면으로 죽지 않게 복구 UI를 보여준다. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("앱 오류:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "sans-serif", height: "100vh", boxSizing: "border-box" }}>
          <h2 style={{ marginTop: 0 }}>⚠ 문제가 발생했어요</h2>
          <p style={{ color: "#666" }}>작업을 되돌리거나 새로고침해 주세요. 데이터가 손상되진 않았습니다.</p>
          <pre style={{ whiteSpace: "pre-wrap", color: "#c0392b", fontSize: 13, background: "#fbf0f0", padding: 12, borderRadius: 6, maxHeight: 200, overflow: "auto" }}>
            {this.state.error.message}
          </pre>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => this.setState({ error: null })}>다시 시도</button>
            <button onClick={() => location.reload()}>새로고침</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
