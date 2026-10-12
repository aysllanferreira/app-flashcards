import { INestApplication } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DB } from '../../src/database/database.providers.js';
import { users } from '../../src/modules/users/schema/users.js';
import { WebhookAckSchema } from '../../src/modules/webhooks/dto/webhook-ack.dto.js';
import {
  type SignedWebhook,
  signSessionToken,
  signWebhook,
  userDeletedEvent,
  userEvent,
} from '../support/clerk.js';
import { createTestApp } from '../support/create-app.js';
import {
  createNoteWithCard,
  createReviewLog,
  createUserWithContent,
  PROVISIONED,
  provisionedCounts,
  useTestDatabase,
} from './helpers.js';

const t = useTestDatabase();

// The user.* handlers of POST /webhooks/clerk, against flashcards_test.
describe('POST /webhooks/clerk (e2e, database)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      override: (builder) => builder.overrideProvider(DB).useValue(t.db),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // Posts a signed delivery and checks the acknowledgement.
  const deliverSigned = async (signed: SignedWebhook) => {
    const res = await request(app.getHttpServer())
      .post('/webhooks/clerk')
      .set('Content-Type', 'application/json')
      .set(signed.headers)
      .send(signed.body)
      .expect(200);
    expect(WebhookAckSchema.parse(res.body)).toEqual({ received: true });
  };
  const deliver = (event: object) => deliverSigned(signWebhook(event));

  const emailOf = async (clerkUserId: string) => {
    const [row] = await t.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId));
    return row?.email;
  };

  it('user.created provisions the account with its primary email', async () => {
    await deliver(userEvent('user.created', 'user_hook', 'hook@example.com'));

    expect(await emailOf('user_hook')).toBe('hook@example.com');
    expect(await provisionedCounts(t.db, 'user_hook')).toEqual(PROVISIONED);
  });

  it('user.created delivered twice leaves one provisioned account', async () => {
    const signed = signWebhook(
      userEvent('user.created', 'user_twice', 'twice@example.com'),
    );
    await deliverSigned(signed);
    await deliverSigned(signed);

    expect(await provisionedCounts(t.db, 'user_twice')).toEqual(PROVISIONED);
  });

  it('user.created fills the email of an account first created by GET /me', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${signSessionToken({ sub: 'user_early' })}`)
      .expect(200);
    expect(await emailOf('user_early')).toBeNull();

    await deliver(userEvent('user.created', 'user_early', 'early@example.com'));

    expect(await emailOf('user_early')).toBe('early@example.com');
    expect(await provisionedCounts(t.db, 'user_early')).toEqual(PROVISIONED);
  });

  it('user.updated changes the stored email', async () => {
    await deliver(userEvent('user.created', 'user_move', 'old@example.com'));
    await deliver(userEvent('user.updated', 'user_move', 'new@example.com'));

    expect(await emailOf('user_move')).toBe('new@example.com');
  });

  it('user.deleted removes the account and everything it owns', async () => {
    const owner = await createUserWithContent(t.db, {
      clerkUserId: 'user_gone',
    });
    const { card } = await createNoteWithCard(t.db, owner);
    await createReviewLog(t.db, {
      userId: owner.user.id,
      cardId: card.id,
      deckId: owner.deck.id,
    });
    await createUserWithContent(t.db, { clerkUserId: 'user_stays' });

    await deliver(userDeletedEvent('user_gone'));

    for (const table of ['decks', 'notes', 'cards', 'review_logs']) {
      const { rows } = await t.db.execute<{ n: string }>(
        sql`select count(*) as n from ${sql.identifier(table)} where user_id = ${owner.user.id}`,
      );
      expect(Number(rows[0].n), `${table} rows of the deleted user`).toBe(0);
    }
    expect(await emailOf('user_gone')).toBeUndefined();
    expect((await provisionedCounts(t.db, 'user_stays')).users).toBe(1);
  });

  it('user.deleted for an unknown account changes nothing', async () => {
    await createUserWithContent(t.db, { clerkUserId: 'user_known' });

    await deliver(userDeletedEvent('user_unknown'));

    const { rows } = await t.db.execute<{ n: string }>(
      sql`select count(*) as n from users`,
    );
    expect(Number(rows[0].n)).toBe(1);
  });

  it('a bad signature creates no account', async () => {
    const signed = signWebhook(
      userEvent('user.created', 'user_forged', 'forged@example.com'),
      {
        secret: `whsec_${Buffer.from('another-secret-of-32-bytes-long!').toString('base64')}`,
      },
    );
    await request(app.getHttpServer())
      .post('/webhooks/clerk')
      .set('Content-Type', 'application/json')
      .set(signed.headers)
      .send(signed.body)
      .expect(400);

    expect(await emailOf('user_forged')).toBeUndefined();
  });
});
