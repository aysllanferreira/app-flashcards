import { asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { deckPresets } from '../../src/modules/decks/schema/deck-presets.js';
import { decks } from '../../src/modules/decks/schema/decks.js';
import { cardTemplates } from '../../src/modules/note-types/schema/card-templates.js';
import { copyStockNoteTypes } from '../../src/modules/note-types/stock-note-types.js';
import { notes } from '../../src/modules/notes/schema/notes.js';
import { users } from '../../src/modules/users/schema/users.js';
import { connectTestDatabase } from './test-database.js';

// Registers the per-file hooks: connect before the file, close after it, and
// start every test from empty tables. Read ctx.db inside tests and hooks.
export function useTestDatabase(): { db: NodePgDatabase } {
  const ctx = {} as ReturnType<typeof connectTestDatabase>;
  beforeAll(() => {
    Object.assign(ctx, connectTestDatabase());
  });
  afterAll(() => ctx.pool.end());
  beforeEach(() => resetDatabase(ctx.db));
  return ctx;
}

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

// A user with a default preset, a top-level deck and their own copies of the
// built-in note types: the starting point of most content tests.
export async function createUserWithContent(
  db: NodePgDatabase,
  values: Partial<typeof users.$inferInsert> = {},
) {
  const user = await createUser(db, values);
  const [preset] = await db
    .insert(deckPresets)
    .values({ userId: user.id, name: 'Default' })
    .returning();
  const [deck] = await db
    .insert(decks)
    .values({ userId: user.id, presetId: preset.id, name: 'Spanish' })
    .returning();
  const [basic, reversed, cloze] = await copyStockNoteTypes(db, user.id);
  const templatesOf = (noteTypeId: string) =>
    db
      .select()
      .from(cardTemplates)
      .where(eq(cardTemplates.noteTypeId, noteTypeId))
      .orderBy(asc(cardTemplates.ord));
  return {
    user,
    preset,
    deck,
    noteTypes: { basic, reversed, cloze },
    templates: {
      basic: await templatesOf(basic.id),
      reversed: await templatesOf(reversed.id),
      cloze: await templatesOf(cloze.id),
    },
  };
}

export async function createNote(
  db: NodePgDatabase,
  values: typeof notes.$inferInsert,
) {
  const [note] = await db.insert(notes).values(values).returning();
  return note;
}

export async function createCard(
  db: NodePgDatabase,
  values: typeof cards.$inferInsert,
) {
  const [card] = await db.insert(cards).values(values).returning();
  return card;
}
