import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The `@/*` path alias from tsconfig.json.
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `server-only` throws outside a React Server Components build; tests
      // import server modules directly.
      "server-only": fileURLToPath(
        new URL("./__tests__/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    // Playwright runs e2e/ (pnpm test:e2e) and screenshots/ (pnpm screenshots).
    exclude: [...configDefaults.exclude, "e2e/**", "screenshots/**"],
  },
});
