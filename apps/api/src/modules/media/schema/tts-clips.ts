import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt } from '../../../database/columns.js';

// Text-to-speech audio, cached globally by content: everyone studying the same
// text in the same voice shares one file at tts/{hash}.mp3. No user_id, so it
// outlives account deletion; a cleanup job removes clips unused for a while.
export const ttsClips = pgTable(
  'tts_clips',
  {
    // Hex SHA-256 of `${lang}|${voice}|${text}`.
    hash: text().primaryKey(),
    lang: text().notNull(),
    voice: text().notNull(),
    s3Key: text().notNull().unique('tts_clips_s3_key_unique'),
    createdAt: createdAt(),
    lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('tts_clips_hash_check', sql`${t.hash} ~ '^[0-9a-f]{64}$'`)],
);
