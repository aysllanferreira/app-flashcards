import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // `server-only` throws outside a React Server Components build; tests
      // import server modules directly.
      "server-only": fileURLToPath(
        new URL("./__tests__/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
  },
});
