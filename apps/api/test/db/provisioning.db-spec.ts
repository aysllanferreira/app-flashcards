import { provisionUser } from '../../src/modules/users/provision-user.js';
import { UsersService } from '../../src/modules/users/users.service.js';
import { PROVISIONED, provisionedCounts, useTestDatabase } from './helpers.js';

const t = useTestDatabase();

describe('provisionUser', () => {
  it('creates the user, a Default preset and the three stock note types', async () => {
    const result = await provisionUser(t.db, {
      clerkUserId: 'user_new',
      email: 'new@example.com',
    });

    expect(result.created).toBe(true);
    expect(result.user).toMatchObject({
      clerkUserId: 'user_new',
      email: 'new@example.com',
    });
    expect(await provisionedCounts(t.db, 'user_new')).toEqual(PROVISIONED);
  });

  it('creates nothing for an existing user and returns the same row', async () => {
    const first = await provisionUser(t.db, { clerkUserId: 'user_again' });
    const second = await provisionUser(t.db, { clerkUserId: 'user_again' });

    expect(second.created).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(await provisionedCounts(t.db, 'user_again')).toEqual(PROVISIONED);
  });

  it('provisions once when two calls race for the same new user', async () => {
    const results = await Promise.all([
      provisionUser(t.db, { clerkUserId: 'user_race' }),
      provisionUser(t.db, { clerkUserId: 'user_race' }),
    ]);

    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(results[0].user.id).toBe(results[1].user.id);
    expect(await provisionedCounts(t.db, 'user_race')).toEqual(PROVISIONED);
  });
});

describe('UsersService', () => {
  const service = () => new UsersService(t.db);

  it('ensureUser provisions a new account with no email', async () => {
    const user = await service().ensureUser('user_ensure');

    expect(user.email).toBeNull();
    expect(await provisionedCounts(t.db, 'user_ensure')).toEqual(PROVISIONED);
  });

  it('syncFromClerk sets the email, then changes it', async () => {
    const created = await service().syncFromClerk('user_sync', 'a@example.com');
    const updated = await service().syncFromClerk('user_sync', 'b@example.com');

    expect(created.email).toBe('a@example.com');
    expect(updated).toMatchObject({ id: created.id, email: 'b@example.com' });
    expect(await provisionedCounts(t.db, 'user_sync')).toEqual(PROVISIONED);
  });

  it('syncFromClerk fills the email of a user created without one', async () => {
    const first = await service().ensureUser('user_fill');
    const synced = await service().syncFromClerk('user_fill', 'c@example.com');

    expect(synced).toMatchObject({ id: first.id, email: 'c@example.com' });
  });
});
