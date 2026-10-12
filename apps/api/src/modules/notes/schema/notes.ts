import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { noteTypes } from '../../note-types/schema/note-types.js';
import { userId } from '../../users/schema/users.js';

// A note holds the content; its note type's templates turn it into cards.
export const notes = pgTable(
  'notes',
  {
    id: id(),
    userId: userId(),
    noteTypeId: uuid().notNull(),
    // Field values (HTML) keyed by the note type field's stable key.
    fields: jsonb().$type<Record<string, string>>().notNull().default({}),
    // Plain text of the note type's sort field, for browsing and sorting.
    sortField: text().notNull().default(''),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Stable identity across imports (Anki's note guid).
    guid: text()
      .notNull()
      .default(sql`gen_random_uuid()::text`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Target of the composite foreign keys from cards and note_media.
    unique('notes_id_user_id_unique').on(t.id, t.userId),
    unique('notes_user_id_guid_unique').on(t.userId, t.guid),
    check('notes_fields_check', sql`jsonb_typeof(${t.fields}) = 'object'`),
    // NO ACTION: a note type that still has notes can't be deleted.
    foreignKey({
      name: 'notes_note_type_fk',
      columns: [t.noteTypeId, t.userId],
      foreignColumns: [noteTypes.id, noteTypes.userId],
    }).onDelete('no action'),
    index('notes_note_type_id_idx').on(t.noteTypeId),
    index('notes_tags_idx').using('gin', t.tags),
  ],
);
