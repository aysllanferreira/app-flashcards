import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { HealthResponseSchema } from './../src/modules/health/dto/health-response.dto.js';
import { createTestApp } from './support/create-app.js';

describe('GET /health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with status ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns a body that matches HealthResponseSchema', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(() => HealthResponseSchema.parse(res.body)).not.toThrow();
  });
});
