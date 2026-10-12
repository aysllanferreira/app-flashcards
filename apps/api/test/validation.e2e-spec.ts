import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { FixtureModule } from './fixtures/fixture.module.js';

const ID = '3f1c2a4e-8b7d-4c6a-9e2f-1a2b3c4d5e6f';

describe('Request validation and response shaping (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, FixtureModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a body that breaks its schema with 400 and a message per field', async () => {
    const res = await request(app.getHttpServer())
      .post(`/fixtures/${ID}`)
      .send({})
      .expect(400);

    expect(Array.isArray(res.body.message)).toBe(true);
    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('title')]),
    );
  });

  it('rejects a path parameter that is not a UUID with 400', async () => {
    await request(app.getHttpServer())
      .post('/fixtures/not-a-uuid')
      .send({ title: 'Hola' })
      .expect(400);
  });

  it('passes the parsed body to the handler', async () => {
    const res = await request(app.getHttpServer())
      .post(`/fixtures/${ID}?verbose=true`)
      .send({ title: '  Hola  ' })
      .expect(201);

    expect(res.body.title).toBe('Hola');
  });

  it('drops fields that the response schema does not list', async () => {
    const res = await request(app.getHttpServer())
      .post(`/fixtures/${ID}`)
      .send({ title: 'Hola' })
      .expect(201);

    expect(res.body).toEqual({ id: ID, title: 'Hola' });
    expect(res.body).not.toHaveProperty('secret');
  });
});
