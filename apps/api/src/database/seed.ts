import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { validateEnv } from '../config/env.js';
import { cards, CARD_STATES } from '../modules/cards/schema/cards.js';
import { deckPresets } from '../modules/decks/schema/deck-presets.js';
import { decks } from '../modules/decks/schema/decks.js';
import { cardTemplates } from '../modules/note-types/schema/card-templates.js';
import { copyStockNoteTypes } from '../modules/note-types/stock-note-types.js';
import { notes } from '../modules/notes/schema/notes.js';
import { reviewLogs } from '../modules/reviews/schema/review-logs.js';
import { users } from '../modules/users/schema/users.js';
import { DB_CASING } from './database.providers.js';

// Local demo data: `pnpm --filter api db:seed` wipes the app database's data
// and creates one user with nested decks, the built-in note types, 10,000
// cards across every state and their review history. It's realistic enough
// to check query plans with EXPLAIN. Same seed, same data on every run.

const DAY = 86_400_000;
const BATCH = 1000;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// mulberry32: a small deterministic PRNG.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The seed truncates every table, so it only ever runs against a local
// database outside production.
function assertSafeTarget(nodeEnv: string, databaseUrl: string) {
  if (nodeEnv === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production.');
  }
  const { hostname } = new URL(databaseUrl);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `Refusing to seed ${hostname}: the seed only runs against a local database.`,
    );
  }
}

async function insertInBatches<T>(
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await insert(rows.slice(i, i + BATCH));
  }
}

async function seed(db: NodePgDatabase) {
  const rand = random(20261012);
  const pick = <T>(items: readonly T[]) =>
    items[Math.floor(rand() * items.length)];
  const now = Date.now();

  const { rows: tables } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  await db.execute(
    sql.raw(
      `truncate ${tables.map((t) => `"${t.tablename}"`).join(', ')} cascade`,
    ),
  );

  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: 'seed_demo_user',
      email: 'demo@example.com',
      timezone: 'Europe/Madrid',
    })
    .returning();
  const [preset] = await db
    .insert(deckPresets)
    .values({ userId: user.id, name: 'Default' })
    .returning();
  const deck = async (name: string, parentId?: string) =>
    (
      await db
        .insert(decks)
        .values({ userId: user.id, presetId: preset.id, name, parentId })
        .returning()
    )[0];
  const spanish = await deck('Spanish');
  const verbs = await deck('Verbs', spanish.id);
  const nouns = await deck('Nouns', spanish.id);
  const french = await deck('French');

  const [basic, reversed, cloze] = await copyStockNoteTypes(db, user.id);
  const templates = await db.select().from(cardTemplates);
  const templatesOf = (noteTypeId: string) =>
    templates
      .filter((t) => t.noteTypeId === noteTypeId)
      .sort((a, b) => a.ord - b.ord);

  type NoteRow = typeof notes.$inferInsert;
  type CardRow = typeof cards.$inferInsert;
  const noteRows: NoteRow[] = [];
  const cardRows: CardRow[] = [];
  let position = 0;

  // A card in a random state: about 60% new, 10% learning, 25% review and
  // 5% relearning, due between 30 days ago and 90 days ahead, 2% suspended.
  const scheduled = (): Partial<CardRow> => {
    const roll = rand();
    const state: (typeof CARD_STATES)[number] =
      roll < 0.6
        ? 'new'
        : roll < 0.7
          ? 'learning'
          : roll < 0.95
            ? 'review'
            : 'relearning';
    const suspended = rand() < 0.02;
    if (state === 'new') {
      return { state, suspended, position: position++ };
    }
    const learning = state === 'learning' || state === 'relearning';
    const dueAt = new Date(
      learning ? now + (rand() - 0.5) * DAY : now + (rand() * 120 - 30) * DAY,
    );
    const reps = 1 + Math.floor(rand() * 12);
    return {
      state,
      suspended,
      dueAt,
      stability: 0.5 + rand() * 60,
      difficulty: 1 + rand() * 9,
      reps,
      lapses: state === 'relearning' ? 1 + Math.floor(rand() * 3) : 0,
      lastReviewAt: new Date(dueAt.getTime() - (1 + rand() * 20) * DAY),
    };
  };

  const addNote = (
    noteTypeId: string,
    fields: Record<string, string>,
    deckId: string,
    cardSpecs: { templateId: string; clozeIndex: number }[],
    tags: string[],
  ) => {
    const noteId = uuidv7();
    noteRows.push({
      id: noteId,
      userId: user.id,
      noteTypeId,
      fields,
      sortField: fields['1'],
      tags,
    });
    for (const spec of cardSpecs) {
      cardRows.push({
        userId: user.id,
        noteId,
        deckId,
        ...spec,
        ...scheduled(),
      });
    }
  };

  // 4,500 reversed vocabulary notes (9,000 cards) across the Spanish
  // subdecks and French.
  const [rev1, rev2] = templatesOf(reversed.id);
  for (let i = 1; i <= 4500; i++) {
    const deckId = pick([verbs.id, nouns.id, french.id]);
    addNote(
      reversed.id,
      { '1': `palabra ${i}`, '2': `word ${i}` },
      deckId,
      [
        { templateId: rev1.id, clozeIndex: 0 },
        { templateId: rev2.id, clozeIndex: 0 },
      ],
      [deckId === french.id ? 'french' : 'spanish', 'vocab'],
    );
  }
  // 500 basic notes (500 cards) in the top-level Spanish deck.
  const [basic1] = templatesOf(basic.id);
  for (let i = 1; i <= 500; i++) {
    addNote(
      basic.id,
      { '1': `¿Pregunta ${i}?`, '2': `Respuesta ${i}` },
      spanish.id,
      [{ templateId: basic1.id, clozeIndex: 0 }],
      ['spanish', 'grammar'],
    );
  }
  // 250 cloze notes with two deletions each (500 cards) in French.
  const [cloze1] = templatesOf(cloze.id);
  for (let i = 1; i <= 250; i++) {
    addNote(
      cloze.id,
      {
        '1': `{{c1::Paris}} est la capitale de la {{c2::France}} (${i})`,
        '2': '',
      },
      french.id,
      [
        { templateId: cloze1.id, clozeIndex: 1 },
        { templateId: cloze1.id, clozeIndex: 2 },
      ],
      ['french', 'cloze'],
    );
  }

  await insertInBatches(noteRows, (batch) => db.insert(notes).values(batch));
  const insertedCards: { id: string; deckId: string; state: string }[] = [];
  await insertInBatches(cardRows, async (batch) => {
    insertedCards.push(
      ...(await db
        .insert(cards)
        .values(batch)
        .returning({ id: cards.id, deckId: cards.deckId, state: cards.state })),
    );
  });

  // 2 to 5 past reviews for every card that has left the new state.
  type LogRow = typeof reviewLogs.$inferInsert;
  const logRows: LogRow[] = [];
  for (const card of insertedCards) {
    if (card.state === 'new') continue;
    const count = 2 + Math.floor(rand() * 4);
    let at = now - (40 + rand() * 60) * DAY;
    for (let i = 0; i < count; i++) {
      const first = i === 0;
      const interval = 1 + rand() * 10;
      logRows.push({
        userId: user.id,
        cardId: card.id,
        deckId: card.deckId,
        rating: first ? 3 : 1 + Math.floor(rand() * 4),
        kind: first ? 'learn' : 'review',
        stateBefore: first ? 'new' : 'review',
        stateAfter: first ? 'learning' : 'review',
        dueBefore: first ? null : new Date(at),
        dueAfter: new Date(at + interval * DAY),
        stabilityBefore: first ? null : 1 + rand() * 30,
        stabilityAfter: 1 + rand() * 30,
        difficultyBefore: first ? null : 1 + rand() * 9,
        difficultyAfter: 1 + rand() * 9,
        elapsedDays: first ? 0 : interval,
        scheduledDays: Math.round(interval),
        durationMs: 2000 + Math.floor(rand() * 15000),
        reviewedAt: new Date(at),
      });
      at += interval * DAY;
    }
  }
  await insertInBatches(logRows, (batch) =>
    db.insert(reviewLogs).values(batch),
  );

  // Fresh planner statistics, so EXPLAIN reflects this data.
  await db.execute(sql`analyze`);

  return {
    notes: noteRows.length,
    cards: insertedCards.length,
    reviewLogs: logRows.length,
  };
}

async function main() {
  // Checked before the environment is parsed, so production stops here even
  // when DATABASE_URL is missing.
  assertSafeTarget(
    process.env.NODE_ENV ?? 'development',
    'postgres://localhost',
  );
  const env = validateEnv(process.env);
  assertSafeTarget(env.NODE_ENV, env.DATABASE_URL);
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  try {
    const counts = await seed(drizzle({ client: pool, casing: DB_CASING }));
    console.log(
      `Seeded user seed_demo_user: ${counts.notes} notes, ${counts.cards} cards, ${counts.reviewLogs} review logs.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
