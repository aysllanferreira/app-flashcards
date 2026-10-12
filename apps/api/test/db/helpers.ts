import { asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { deckPresets } from '../../src/modules/decks/schema/deck-presets.js';
import { decks } from '../../src/modules/decks/schema/decks.js';
import { media } from '../../src/modules/media/schema/media.js';
import { cardTemplates } from '../../src/modules/note-types/schema/card-templates.js';
import { noteTypes } from '../../src/modules/note-types/schema/note-types.js';
import { copyStockNoteTypes } from '../../src/modules/note-types/stock-note-types.js';
import { notes } from '../../src/modules/notes/schema/notes.js';
import { reviewLogs } from '../../src/modules/reviews/schema/review-logs.js';
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

// A Basic note with its one card in the user's deck.
export async function createNoteWithCard(
  db: NodePgDatabase,
  a: Awaited<ReturnType<typeof createUserWithContent>>,
) {
  const note = await createNote(db, {
    userId: a.user.id,
    noteTypeId: a.noteTypes.basic.id,
    fields: { '1': 'hola', '2': 'hello' },
  });
  const card = await createCard(db, {
    userId: a.user.id,
    noteId: note.id,
    templateId: a.templates.basic[0].id,
    deckId: a.deck.id,
  });
  return { note, card };
}

export async function createReviewLog(
  db: NodePgDatabase,
  values: Partial<typeof reviewLogs.$inferInsert> & { userId: string },
) {
  const [log] = await db
    .insert(reviewLogs)
    .values({
      rating: 3,
      kind: 'learn',
      stateBefore: 'new',
      stateAfter: 'learning',
      dueAfter: new Date(Date.now() + 600_000),
      ...values,
    })
    .returning();
  return log;
}

let mediaSeq = 0;

// A media row with a unique file hash unless one is given.
export async function createMedia(
  db: NodePgDatabase,
  values: Partial<typeof media.$inferInsert> & { userId: string },
) {
  const n = ++mediaSeq;
  const [row] = await db
    .insert(media)
    .values({
      sha256: n.toString(16).padStart(64, '0'),
      s3Key: `media/test-${n}.png`,
      filename: `image-${n}.png`,
      contentType: 'image/png',
      sizeBytes: 1024,
      ...values,
    })
    .returning();
  return row;
}

// What one Clerk account owns right after provisioning.
export async function provisionedCounts(
  db: NodePgDatabase,
  clerkUserId: string,
) {
  const owned = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  if (owned.length === 0) return { users: 0, presets: [], noteTypes: [] };
  const userId = owned[0].id;
  const presets = await db
    .select({ name: deckPresets.name })
    .from(deckPresets)
    .where(eq(deckPresets.userId, userId));
  const types = await db
    .select({ name: noteTypes.name })
    .from(noteTypes)
    .where(eq(noteTypes.userId, userId));
  return {
    users: owned.length,
    presets: presets.map((p) => p.name),
    noteTypes: types.map((n) => n.name).sort(),
  };
}

export const PROVISIONED = {
  users: 1,
  presets: ['Default'],
  noteTypes: ['Basic', 'Basic (and reversed card)', 'Cloze'],
};
