import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DB_CASING } from '../../src/database/database.providers.js';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://flashcards:flashcards@localhost:5432/flashcards_test';

// The suite truncates every table, so it refuses any database whose name
// doesn't end in _test: it can never wipe the app database.
export function assertTestDatabase(url: string): void {
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run the database suite against "${name}": its name must end in _test.`,
    );
  }
}

export function connectTestDatabase(): {
  pool: pg.Pool;
  db: NodePgDatabase;
} {
  assertTestDatabase(TEST_DATABASE_URL);
  const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
  return { pool, db: drizzle({ client: pool, casing: DB_CASING }) };
}
