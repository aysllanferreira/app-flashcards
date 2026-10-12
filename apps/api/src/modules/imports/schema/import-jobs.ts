import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { decks } from '../../decks/schema/decks.js';
import { userId } from '../../users/schema/users.js';

export const IMPORT_FORMATS = ['csv', 'apkg'] as const;
export const IMPORT_STATUSES = [
  'pending',
  'running',
  'done',
  'failed',
] as const;

// One bulk import (CSV or Anki .apkg), processed by the worker.
export const importJobs = pgTable(
  'import_jobs',
  {
    id: id(),
    userId: userId(),
    // Target deck, if any. Single-column so deleting the deck keeps the job;
    // the service that creates jobs checks the deck's owner.
    deckId: uuid().references(() => decks.id, { onDelete: 'set null' }),
    s3Key: text().notNull(),
    format: text({ enum: IMPORT_FORMATS }).notNull(),
    status: text({ enum: IMPORT_STATUSES }).notNull().default('pending'),
    notesTotal: integer(),
    notesDone: integer().notNull().default(0),
    error: text(),
    finishedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('import_jobs_format_check', sql`${t.format} in ('csv', 'apkg')`),
    check(
      'import_jobs_status_check',
      sql`${t.status} in ('pending', 'running', 'done', 'failed')`,
    ),
    index('import_jobs_deck_id_idx').on(t.deckId),
  ],
);
