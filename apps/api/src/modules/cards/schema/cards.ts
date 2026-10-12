import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { decks } from '../../decks/schema/decks.js';
import { cardTemplates } from '../../note-types/schema/card-templates.js';
import { notes } from '../../notes/schema/notes.js';
import { userId } from '../../users/schema/users.js';

export const CARD_STATES = ['new', 'learning', 'review', 'relearning'] as const;

// A card is one template of one note (or one cloze deletion) in one deck. It
// holds no content, only the FSRS scheduling state, so reviews update narrow
// rows.
export const cards = pgTable(
  'cards',
  {
    id: id(),
    userId: userId(),
    noteId: uuid().notNull(),
    templateId: uuid().notNull(),
    // Cloze number for cloze note types; 0 otherwise.
    clozeIndex: smallint().notNull().default(0),
    deckId: uuid().notNull(),
    // Order in the new-card queue.
    position: integer().notNull().default(0),
    state: text({ enum: CARD_STATES }).notNull().default('new'),
    dueAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // FSRS memory state; null until the first review.
    stability: real(),
    difficulty: real(),
    // Index into the preset's learning or relearning steps.
    step: smallint().notNull().default(0),
    reps: integer().notNull().default(0),
    lapses: integer().notNull().default(0),
    lastReviewAt: timestamp({ withTimezone: true }),
    suspended: boolean().notNull().default(false),
    buriedUntil: timestamp({ withTimezone: true }),
    flag: smallint().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('cards_note_id_template_id_cloze_index_unique').on(
      t.noteId,
      t.templateId,
      t.clozeIndex,
    ),
    check(
      'cards_state_check',
      sql`${t.state} in ('new', 'learning', 'review', 'relearning')`,
    ),
    check('cards_flag_check', sql`${t.flag} between 0 and 7`),
    check('cards_cloze_index_check', sql`${t.clozeIndex} >= 0`),
    foreignKey({
      name: 'cards_note_fk',
      columns: [t.noteId, t.userId],
      foreignColumns: [notes.id, notes.userId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'cards_template_fk',
      columns: [t.templateId, t.userId],
      foreignColumns: [cardTemplates.id, cardTemplates.userId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'cards_deck_fk',
      columns: [t.deckId, t.userId],
      foreignColumns: [decks.id, decks.userId],
    }).onDelete('cascade'),
    // Study queues. Queries must repeat these predicates exactly; burying is
    // filtered at query time because now() can't appear in an index.
    index('cards_review_queue_idx')
      .on(t.deckId, t.dueAt)
      .where(sql`state <> 'new' and suspended = false`),
    index('cards_new_queue_idx')
      .on(t.deckId, t.position)
      .where(sql`state = 'new' and suspended = false`),
    index('cards_reminders_idx')
      .on(t.userId, t.dueAt)
      .where(sql`state <> 'new' and suspended = false`),
    // Cascades from card_templates and decks.
    index('cards_template_id_idx').on(t.templateId),
    index('cards_deck_id_idx').on(t.deckId),
  ],
);
