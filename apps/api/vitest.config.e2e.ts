import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Points the app at the locally signed test tokens (test/support/clerk.ts).
    setupFiles: ['./test/support/env.ts'],
  },
});
