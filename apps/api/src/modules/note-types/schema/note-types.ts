import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, text, unique } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { userId } from '../../users/schema/users.js';

export const NOTE_TYPE_KINDS = ['standard', 'cloze'] as const;

// A note type, as in Anki: its fields (note_type_fields) and card templates
// (card_templates) decide which cards a note produces. Every note type belongs
// to one user; the built-in ones are copied into each account.
export const noteTypes = pgTable(
  'note_types',
  {
    id: id(),
    userId: userId(),
    name: text().notNull(),
    kind: text({ enum: NOTE_TYPE_KINDS }).notNull().default('standard'),
    css: text().notNull().default(''),
    // Field whose plain text fills notes.sort_field.
    sortFieldKey: smallint().notNull().default(1),
    // Next key to give a new field; keys are never reused after a delete.
    nextFieldKey: smallint().notNull().default(1),
    // The note type's id in an imported Anki collection.
    sourceGuid: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('note_types_id_user_id_unique').on(t.id, t.userId),
    check('note_types_kind_check', sql`${t.kind} in ('standard', 'cloze')`),
  ],
);
