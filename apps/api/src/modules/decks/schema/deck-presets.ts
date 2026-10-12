import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgTable,
  real,
  text,
  unique,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { userId } from '../../users/schema/users.js';

// Deck options shared by any number of decks, as in Anki: daily limits,
// learning steps and the FSRS settings.
export const deckPresets = pgTable(
  'deck_presets',
  {
    id: id(),
    userId: userId(),
    name: text().notNull(),
    newPerDay: integer().notNull().default(20),
    reviewsPerDay: integer().notNull().default(200),
    // Learning and relearning steps, in seconds.
    learningStepsS: integer()
      .array()
      .notNull()
      .default(sql`'{60,600}'::integer[]`),
    relearningStepsS: integer()
      .array()
      .notNull()
      .default(sql`'{600}'::integer[]`),
    desiredRetention: real().notNull().default(0.9),
    maxIntervalDays: integer().notNull().default(36500),
    // Per-user FSRS parameters once optimized; null means the FSRS defaults.
    fsrsParams: real().array(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Target of the composite foreign key from decks.
    unique('deck_presets_id_user_id_unique').on(t.id, t.userId),
    check(
      'deck_presets_limits_check',
      sql`${t.newPerDay} >= 0 and ${t.reviewsPerDay} >= 0 and ${t.maxIntervalDays} > 0`,
    ),
    check(
      'deck_presets_desired_retention_check',
      sql`${t.desiredRetention} between 0.7 and 0.99`,
    ),
  ],
);
