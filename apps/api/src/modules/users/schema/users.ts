import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  pgTable,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from '../../../database/columns.js';

// One row per Clerk account. Every user-owned row in the database references
// this table through userId() and is deleted with its user.
export const users = pgTable(
  'users',
  {
    id: id(),
    clerkUserId: text().notNull().unique('users_clerk_user_id_unique'),
    // Clerk accounts can be phone- or username-only.
    email: text(),
    // IANA time zone, used with dayRolloverHour to decide when a study day
    // starts (Anki's "next day starts at").
    timezone: text().notNull().default('UTC'),
    dayRolloverHour: smallint().notNull().default(4),
    remindersOn: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      'users_day_rollover_hour_check',
      sql`${t.dayRolloverHour} between 0 and 23`,
    ),
  ],
);

// The owner column of every user-owned table.
export const userId = () =>
  uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' });
