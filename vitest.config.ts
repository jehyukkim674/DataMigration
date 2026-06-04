import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/main.tsx",
        "src/App.tsx",
        "src/vite-env.d.ts",
        // 캔버스/그리드 글루(jsdom에서 canvas 미지원) + 통합 진입점
        "src/grid/DataGrid.tsx",
        "src/grid/Minimap.tsx",
        "src/views/RootView.tsx",
      ],
      thresholds: { lines: 90, statements: 85, functions: 80, branches: 70 },
    },
  },
});
