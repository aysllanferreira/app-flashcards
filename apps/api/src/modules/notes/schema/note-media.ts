import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt } from '../../../database/columns.js';
import { media } from '../../media/schema/media.js';
import { userId } from '../../users/schema/users.js';
import { notes } from './notes.js';

// Which media files a note's fields reference, so unused files can be found.
// Both ends belong to the same user.
export const noteMedia = pgTable(
  'note_media',
  {
    userId: userId(),
    noteId: uuid().notNull(),
    mediaId: uuid().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'note_media_pk', columns: [t.noteId, t.mediaId] }),
    foreignKey({
      name: 'note_media_note_fk',
      columns: [t.noteId, t.userId],
      foreignColumns: [notes.id, notes.userId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'note_media_media_fk',
      columns: [t.mediaId, t.userId],
      foreignColumns: [media.id, media.userId],
    }).onDelete('cascade'),
    index('note_media_media_id_idx').on(t.mediaId),
  ],
);
