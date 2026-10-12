import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DB } from '../../src/database/database.providers.js';
import { MeResponseSchema } from '../../src/modules/users/dto/me-response.dto.js';
import { signSessionToken } from '../support/clerk.js';
import { createTestApp } from '../support/create-app.js';
import { PROVISIONED, provisionedCounts, useTestDatabase } from './helpers.js';

const t = useTestDatabase();

// GET /me end to end: a valid token reaches the handler, and the account is
// created and provisioned on the first request (flashcards_test).
describe('GET /me (e2e, database)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      override: (builder) => builder.overrideProvider(DB).useValue(t.db),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const getMe = (clerkUserId: string) =>
    request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${signSessionToken({ sub: clerkUserId })}`);

  it('returns the new account, provisioned on its first request', async () => {
    const res = await getMe('user_first').expect(200);
    const me = MeResponseSchema.parse(res.body);

    expect(me).toMatchObject({
      email: null,
      timezone: 'UTC',
      dayRolloverHour: 4,
      remindersOn: true,
    });
    expect(res.body).not.toHaveProperty('clerkUserId');
    expect(await provisionedCounts(t.db, 'user_first')).toEqual(PROVISIONED);
  });

  it('returns the same account on a later request and provisions nothing more', async () => {
    const first = MeResponseSchema.parse((await getMe('user_later')).body);
    const second = MeResponseSchema.parse(
      (await getMe('user_later').expect(200)).body,
    );

    expect(second.id).toBe(first.id);
    expect(await provisionedCounts(t.db, 'user_later')).toEqual(PROVISIONED);
  });

  it('provisions once when two first requests arrive together', async () => {
    const [a, b] = await Promise.all([
      getMe('user_together'),
      getMe('user_together'),
    ]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(MeResponseSchema.parse(a.body).id).toBe(
      MeResponseSchema.parse(b.body).id,
    );
    expect(await provisionedCounts(t.db, 'user_together')).toEqual(PROVISIONED);
  });
});
