import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';
import { userId } from '../../users/schema/users.js';

// Files a user uploaded or imported, stored once per user by content hash and
// linked to notes through note_media.
export const media = pgTable(
  'media',
  {
    id: id(),
    userId: userId(),
    // Hex SHA-256 of the file's bytes.
    sha256: text().notNull(),
    s3Key: text().notNull().unique('media_s3_key_unique'),
    // Name the file had when uploaded or imported (Anki references by name).
    filename: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Target of the composite foreign key from note_media.
    unique('media_id_user_id_unique').on(t.id, t.userId),
    unique('media_user_id_sha256_unique').on(t.userId, t.sha256),
    check('media_sha256_check', sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check('media_size_bytes_check', sql`${t.sizeBytes} >= 0`),
  ],
);
