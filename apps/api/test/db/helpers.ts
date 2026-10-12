import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../../src/modules/users/schema/users.js';

// Postgres error codes the constraint tests expect.
export const PG = {
  uniqueViolation: '23505',
  foreignKeyViolation: '23503',
  checkViolation: '23514',
} as const;

// Empties every table in the public schema, so each test starts clean and
// new tables are covered without touching this helper.
export async function resetDatabase(db: NodePgDatabase): Promise<void> {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  await db.execute(sql.raw(`truncate ${tables} cascade`));
}

// Drizzle 0.45 wraps driver errors in DrizzleQueryError; the Postgres code is
// on its cause.
export async function expectPgError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  let error: unknown;
  try {
    await promise;
  } catch (caught) {
    error = caught;
  }
  expect(error, `expected Postgres error ${code}`).toBeDefined();
  const cause = (error as { cause?: { code?: string } }).cause;
  const actual = cause?.code ?? (error as { code?: string }).code;
  expect(actual).toBe(code);
}

let clerkSeq = 0;

export async function createUser(
  db: NodePgDatabase,
  values: Partial<typeof users.$inferInsert> = {},
) {
  const [user] = await db
    .insert(users)
    .values({ clerkUserId: `user_test_${++clerkSeq}`, ...values })
    .returning();
  return user;
}
