import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { userId } from '../../users/schema/users.js';
import { deckPresets } from './deck-presets.js';

// Decks nest through parent_id (Anki's "Spanish::Verbs"). Every reference
// carries user_id, so a deck can't point at another user's deck or preset.
export const decks = pgTable(
  'decks',
  {
    id: id(),
    userId: userId(),
    parentId: uuid(),
    presetId: uuid().notNull(),
    name: text().notNull(),
    description: text().notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('decks_id_user_id_unique').on(t.id, t.userId),
    // Sibling names are unique; NULLS NOT DISTINCT covers top-level decks.
    unique('decks_user_id_parent_id_name_unique')
      .on(t.userId, t.parentId, t.name)
      .nullsNotDistinct(),
    check('decks_name_check', sql`btrim(${t.name}) <> ''`),
    // Subdecks go with their parent, as in Anki.
    foreignKey({
      name: 'decks_parent_fk',
      columns: [t.parentId, t.userId],
      foreignColumns: [t.id, t.userId],
    }).onDelete('cascade'),
    // NO ACTION, not RESTRICT: a preset in use can't be deleted, but deleting
    // the user still cascades through decks and presets in one statement.
    foreignKey({
      name: 'decks_preset_fk',
      columns: [t.presetId, t.userId],
      foreignColumns: [deckPresets.id, deckPresets.userId],
    }).onDelete('no action'),
    index('decks_preset_id_idx').on(t.presetId),
  ],
);
