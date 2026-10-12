import {
  foreignKey,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { userId } from '../../users/schema/users.js';
import { noteTypes } from './note-types.js';

// The card templates of a note type, in Anki's syntax ({{Field}},
// {{FrontSide}}, {{cloze:Text}}). Each template gives one card per note; a
// cloze note type has one template and one card per deletion.
export const cardTemplates = pgTable(
  'card_templates',
  {
    id: id(),
    userId: userId(),
    noteTypeId: uuid().notNull(),
    name: text().notNull(),
    ord: smallint().notNull(),
    frontHtml: text().notNull(),
    backHtml: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Target of the composite foreign key from cards.
    unique('card_templates_id_user_id_unique').on(t.id, t.userId),
    unique('card_templates_note_type_id_name_unique').on(t.noteTypeId, t.name),
    foreignKey({
      name: 'card_templates_note_type_fk',
      columns: [t.noteTypeId, t.userId],
      foreignColumns: [noteTypes.id, noteTypes.userId],
    }).onDelete('cascade'),
  ],
);
