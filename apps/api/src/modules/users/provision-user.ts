import { eq } from 'drizzle-orm';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { deckPresets } from '../decks/schema/deck-presets.js';
import { copyStockNoteTypes } from '../note-types/stock-note-types.js';
import { users } from './schema/users.js';

// A Drizzle database or a transaction on it.
type Db = PgDatabase<NodePgQueryResultHKT>;

export type User = typeof users.$inferSelect;

export const DEFAULT_PRESET_NAME = 'Default';

/**
 * Creates a Clerk account's user, its "Default" deck preset and its copies of
 * the stock note types, in one transaction, exactly once. For an existing
 * user it creates nothing and returns the stored row.
 *
 * The unique clerk_user_id makes this safe under concurrency: a second
 * transaction inserting the same user waits on the first, then inserts nothing
 * and reads the committed row instead. This is the only way a user is
 * created (the auth guard, the Clerk webhook and the dev seed all call it).
 */
export async function provisionUser(
  db: Db,
  { clerkUserId, email = null }: { clerkUserId: string; email?: string | null },
) {
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(users)
      .values({ clerkUserId, email })
      .onConflictDoNothing({ target: users.clerkUserId })
      .returning();

    if (!inserted) {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId));
      return { user, created: false as const };
    }

    const [preset] = await tx
      .insert(deckPresets)
      .values({ userId: inserted.id, name: DEFAULT_PRESET_NAME })
      .returning();
    const noteTypes = await copyStockNoteTypes(tx, inserted.id);
    return { user: inserted, created: true as const, preset, noteTypes };
  });
}
