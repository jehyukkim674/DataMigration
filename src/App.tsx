import { RootView } from "./views/RootView";
import { ErrorBoundary } from "./views/ErrorBoundary";
import "./App.css";

export default function App() {
  return (
    <ErrorBoundary>
      <RootView />
    </ErrorBoundary>
  );
}
