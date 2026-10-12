import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ErrorResponseSchema } from '../src/common/dto/error-response.dto.js';
import { WebhookAckSchema } from '../src/modules/webhooks/dto/webhook-ack.dto.js';
import {
  sessionCreatedEvent,
  signWebhook,
  type SignedWebhook,
  userEvent,
} from './support/clerk.js';
import { createTestApp } from './support/create-app.js';

// Signature handling of POST /webhooks/clerk. None of these requests reach the
// database; the user.* handlers are covered in test/db/webhooks.db-spec.ts.
describe('POST /webhooks/clerk (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const post = ({ body, headers }: Partial<SignedWebhook> & { body: string }) =>
    request(app.getHttpServer())
      .post('/webhooks/clerk')
      .set('Content-Type', 'application/json')
      .set(headers ?? {})
      .send(body);

  it('rejects a payload signed with another secret with 400', async () => {
    const signed = signWebhook(
      userEvent('user.created', 'user_forged', 'x@example.com'),
      {
        secret: `whsec_${Buffer.from('another-secret-of-32-bytes-long!').toString('base64')}`,
      },
    );
    const res = await post(signed).expect(400);

    expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(400);
  });

  it('rejects a payload without the Svix headers with 400, not 401', async () => {
    const { body } = signWebhook(
      userEvent('user.created', 'user_unsigned', 'x@example.com'),
    );
    const res = await post({ body }).expect(400);

    expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(400);
  });

  it('rejects a body changed after signing with 400', async () => {
    const signed = signWebhook(
      userEvent('user.created', 'user_tampered', 'x@example.com'),
    );
    await post({
      ...signed,
      body: signed.body.replace('user_tampered', 'user_victim'),
    }).expect(400);
  });

  it('acknowledges and ignores a verified event of another type', async () => {
    const res = await post(signWebhook(sessionCreatedEvent('user_any'))).expect(
      200,
    );

    expect(WebhookAckSchema.parse(res.body)).toEqual({ received: true });
  });
});
