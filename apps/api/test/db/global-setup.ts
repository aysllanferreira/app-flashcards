import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { TEST_DATABASE_URL, connectTestDatabase } from './test-database.js';

const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

// Applies the committed migrations to flashcards_test before any test runs,
// so the suite also proves they apply cleanly.
export default async function setup() {
  const { pool, db } = connectTestDatabase();
  try {
    await pool.query('select 1');
  } catch (error) {
    await pool.end();
    const { host } = new URL(TEST_DATABASE_URL);
    // A refused connection is an AggregateError with an empty message.
    const { code, message } = error as { code?: string; message?: string };
    throw new Error(
      `Database unreachable at ${host} (${code ?? message}). ` +
        'Start it with "docker compose up -d --wait db" from the repo root.',
    );
  }
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS });
  } finally {
    await pool.end();
  }
}
