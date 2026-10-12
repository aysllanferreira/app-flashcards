import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// The Clerk keys (.env.local) and the signed-in test user (.env.test.local,
// E2E_CLERK_USER_EMAIL); both are git-ignored.
for (const file of [".env.local", ".env.test.local"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const PORT = 3000;

/**
 * Browser tests against the production build, at phone (375 px) and desktop
 * (1280 px) widths. Run with `pnpm --filter web test:e2e`; they are not part of
 * `pnpm test`, which stays offline and needs no server.
 *
 * `pnpm --filter web screenshots` runs screenshots/ instead, which saves the
 * review screenshots under design/ (never part of test:e2e).
 */
export default defineConfig({
  testDir: process.env.SCREENSHOTS ? "./screenshots" : "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Screenshot runs seed the same deck names in each project: one at a time.
  fullyParallel: !process.env.SCREENSHOTS,
  workers: process.env.SCREENSHOTS ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    {
      // The API, for the signed-in tests. It needs the local database
      // (docker compose up -d --wait db); a running `pnpm dev` API is reused.
      command: "pnpm exec turbo run build --filter=api && pnpm --filter api start:prod",
      url: "http://localhost:3001/health",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      // The real build, not the dev server; turbo builds the workspace
      // packages the app imports first. Port 3000 is the origin the API and
      // Clerk expect (WEB_ORIGIN), so stop `pnpm dev` before running these.
      command: `pnpm exec turbo run build --filter=web && pnpm start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      // Production mode requires API_URL; the local API by default.
      env: { API_URL: process.env.API_URL ?? "http://localhost:3001" },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
