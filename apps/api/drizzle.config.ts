import { defineConfig } from 'drizzle-kit';

// drizzle-kit reads the tables from every module's schema/ folder and writes
// SQL migrations to ./drizzle. Generate with `pnpm --filter api db:generate`,
// review and commit the SQL, apply with `pnpm --filter api db:migrate`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/*/schema/*.ts',
  out: './drizzle',
  // Must match DB_CASING in src/database/database.providers.ts.
  casing: 'snake_case',
  dbCredentials: {
    // Same default as src/config/env.ts: the local Docker database.
    url:
      process.env.DATABASE_URL ??
      'postgres://flashcards:flashcards@localhost:5432/flashcards',
  },
  strict: true,
  verbose: true,
});
