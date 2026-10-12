import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  jsonb,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { userId } from '../../users/schema/users.js';
import { noteTypes } from './note-types.js';

// The fields of a note type. Notes store values under the field's stable key,
// so renaming or reordering fields never rewrites notes.
export const noteTypeFields = pgTable(
  'note_type_fields',
  {
    id: id(),
    userId: userId(),
    noteTypeId: uuid().notNull(),
    key: smallint().notNull(),
    name: text().notNull(),
    // Display order. Not unique, so reordering needs no deferred constraint.
    ord: smallint().notNull(),
    // BCP 47 language of the field's text, used for TTS.
    lang: text(),
    rtl: boolean().notNull().default(false),
    options: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('note_type_fields_note_type_id_key_unique').on(t.noteTypeId, t.key),
    unique('note_type_fields_note_type_id_name_unique').on(
      t.noteTypeId,
      t.name,
    ),
    check('note_type_fields_key_check', sql`${t.key} > 0`),
    foreignKey({
      name: 'note_type_fields_note_type_fk',
      columns: [t.noteTypeId, t.userId],
      foreignColumns: [noteTypes.id, noteTypes.userId],
    }).onDelete('cascade'),
  ],
);
