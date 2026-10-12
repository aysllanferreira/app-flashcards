import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id } from '../../../database/columns.js';
import { CARD_STATES, cards } from '../../cards/schema/cards.js';
import { decks } from '../../decks/schema/decks.js';
import { userId } from '../../users/schema/users.js';

export const REVIEW_KINDS = ['learn', 'review', 'relearn', 'manual'] as const;

const states = `('new', 'learning', 'review', 'relearning')`;

// Append-only review history: the one data set that can't be rebuilt. FSRS
// tunes each user's parameters from it, statistics read it, and the state
// before each review makes undo possible. Rows outlive their card and deck.
export const reviewLogs = pgTable(
  'review_logs',
  {
    // Supplied by the client, so a retried submission is stored once.
    id: id(),
    userId: userId(),
    // Single-column foreign keys: a composite one with SET NULL would also
    // null user_id. The services that write review logs check ownership.
    cardId: uuid().references(() => cards.id, { onDelete: 'set null' }),
    deckId: uuid().references(() => decks.id, { onDelete: 'set null' }),
    // Again, Hard, Good, Easy.
    rating: smallint().notNull(),
    kind: text({ enum: REVIEW_KINDS }).notNull(),
    stateBefore: text({ enum: CARD_STATES }).notNull(),
    stateAfter: text({ enum: CARD_STATES }).notNull(),
    dueBefore: timestamp({ withTimezone: true }),
    dueAfter: timestamp({ withTimezone: true }).notNull(),
    // Null while a card is new, and after a manual reset.
    stabilityBefore: real(),
    stabilityAfter: real(),
    difficultyBefore: real(),
    difficultyAfter: real(),
    elapsedDays: real().notNull().default(0),
    scheduledDays: integer().notNull().default(0),
    durationMs: integer().notNull().default(0),
    reviewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    check('review_logs_rating_check', sql`${t.rating} between 1 and 4`),
    check(
      'review_logs_kind_check',
      sql`${t.kind} in ('learn', 'review', 'relearn', 'manual')`,
    ),
    check(
      'review_logs_states_check',
      sql`${t.stateBefore} in ${sql.raw(states)} and ${t.stateAfter} in ${sql.raw(states)}`,
    ),
    check('review_logs_duration_ms_check', sql`${t.durationMs} >= 0`),
    // Daily limits and statistics per user, per card and per deck.
    index('review_logs_user_id_reviewed_at_idx').on(t.userId, t.reviewedAt),
    index('review_logs_card_id_reviewed_at_idx').on(t.cardId, t.reviewedAt),
    index('review_logs_deck_id_reviewed_at_idx').on(t.deckId, t.reviewedAt),
  ],
);
