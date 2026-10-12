import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Database suite: tests that run against the flashcards_test database in the
// local Docker Postgres (`docker compose up -d --wait db`). Files share one
// database, so they run one at a time.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/db/**/*.db-spec.ts'],
    globalSetup: ['./test/db/global-setup.ts'],
    // Points the app at the locally signed test tokens (test/support/clerk.ts).
    setupFiles: ['./test/support/env.ts'],
    fileParallelism: false,
  },
});
