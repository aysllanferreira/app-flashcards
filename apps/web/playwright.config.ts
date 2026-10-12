import { defineConfig } from "@playwright/test";

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
  fullyParallel: true,
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
  webServer: {
    // The real build, not the dev server; turbo builds the workspace packages
    // the app imports first. Port 3000 is the origin the API and Clerk expect
    // (WEB_ORIGIN), so stop `pnpm dev` before running these.
    command: `pnpm exec turbo run build --filter=web && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
