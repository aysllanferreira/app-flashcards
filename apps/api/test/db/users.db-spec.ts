import { eq, sql } from 'drizzle-orm';
import { users } from '../../src/modules/users/schema/users.js';
import { PG, createUser, expectPgError, useTestDatabase } from './helpers.js';

const t = useTestDatabase();

describe('users', () => {
  it('stores a user and reads it back with the defaults', async () => {
    const created = await createUser(t.db, {
      clerkUserId: 'user_abc',
      email: 'learner@example.com',
    });

    const [row] = await t.db
      .select()
      .from(users)
      .where(eq(users.id, created.id));
    expect(row).toMatchObject({
      clerkUserId: 'user_abc',
      email: 'learner@example.com',
      timezone: 'UTC',
      dayRolloverHour: 4,
      remindersOn: true,
    });
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it('gets a version 7 UUID, from the app or from the database default', async () => {
    const fromApp = await createUser(t.db);
    const { rows } = await t.db.execute<{ id: string }>(
      sql`insert into users (clerk_user_id) values ('user_raw_sql') returning id`,
    );
    const versions = await t.db.execute<{ v: number }>(
      sql`select uuid_extract_version(id) as v from users order by created_at`,
    );

    expect(fromApp.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(rows[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(versions.rows.map((r) => Number(r.v))).toEqual([7, 7]);
  });

  it('rejects a second user with the same Clerk id', async () => {
    await createUser(t.db, { clerkUserId: 'user_dup' });
    await expectPgError(
      createUser(t.db, { clerkUserId: 'user_dup' }),
      PG.uniqueViolation,
    );
  });

  it('rejects a day rollover hour outside 0..23', async () => {
    await expectPgError(
      createUser(t.db, { dayRolloverHour: 24 }),
      PG.checkViolation,
    );
    await expectPgError(
      createUser(t.db, { dayRolloverHour: -1 }),
      PG.checkViolation,
    );
  });
});
