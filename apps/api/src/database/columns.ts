import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

// Shared column builders, so every table follows the same conventions
// (CLAUDE.md, Database). Tables themselves live in src/modules/<name>/schema/.

// Primary key: a time-ordered UUIDv7. Drizzle inserts set it in the app, so the
// id is known before the row is written; raw SQL falls back to Postgres 18's
// uuidv7().
export const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7())
    .default(sql`uuidv7()`);

export const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

// Set by Drizzle on every update; raw SQL updates must set it themselves.
export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
