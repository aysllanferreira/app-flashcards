import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ErrorResponseSchema } from '../src/common/dto/error-response.dto.js';
import { signSessionToken, TEST_WEB_ORIGIN } from './support/clerk.js';
import { createTestApp } from './support/create-app.js';

// Requests the guard turns away before any database access, so this suite
// needs no database. Successful requests are in test/db/me.db-spec.ts.
describe('Auth guard and CORS (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({ docs: true });
  });

  afterAll(async () => {
    await app.close();
  });

  const now = () => Math.floor(Date.now() / 1000);

  it.each([
    ['no Authorization header', undefined],
    ['a malformed token', 'Bearer not-a-jwt'],
    [
      'an expired token',
      `Bearer ${signSessionToken({ sub: 'user_e2e', iat: now() - 600, nbf: now() - 600, exp: now() - 300 })}`,
    ],
    [
      'a token from another origin',
      `Bearer ${signSessionToken({ sub: 'user_e2e', azp: 'https://evil.example' })}`,
    ],
  ])('GET /me with %s returns 401 ErrorResponse', async (_case, header) => {
    const req = request(app.getHttpServer()).get('/me');
    if (header) req.set('Authorization', header);
    const res = await req.expect(401);

    expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(401);
  });

  it('serves GET /health without a token', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('serves GET /docs-json without a token', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(res.body.openapi).toBe('3.1.0');
  });

  it('allows a preflight from the web origin, including Authorization', async () => {
    const res = await request(app.getHttpServer())
      .options('/me')
      .set('Origin', TEST_WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');

    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe(TEST_WEB_ORIGIN);
    expect(res.headers['access-control-allow-headers']).toMatch(
      /authorization/i,
    );
  });

  it('gives a preflight from another origin no Access-Control-Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/me')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
