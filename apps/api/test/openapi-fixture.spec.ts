import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type {
  OpenAPIObject,
  ParameterObject,
  SchemaObject,
} from '@nestjs/swagger';
import { AppModule } from '../src/app.module.js';
import { buildOpenApiDocument } from '../src/openapi/build-document.js';
import { FixtureModule } from './fixtures/fixture.module.js';

// Proves that every kind of schema a route can declare (body, query, path
// parameter, response) reaches the OpenAPI document through the Zod converter.
describe('OpenAPI conversion of declared Zod schemas', () => {
  let app: INestApplication;
  let doc: OpenAPIObject;

  const component = (ref: unknown): SchemaObject => {
    const name = String((ref as { $ref: string }).$ref)
      .split('/')
      .pop()!;
    return doc.components!.schemas![name] as SchemaObject;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, FixtureModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    doc = buildOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const operation = () => doc.paths['/fixtures/{id}'].post!;
  const parameter = (name: string) =>
    (operation().parameters as ParameterObject[]).find((p) => p.name === name);

  it('converts the request body', () => {
    const body = operation().requestBody as {
      content: Record<string, { schema: unknown }>;
    };
    const schema = component(body.content['application/json'].schema);
    expect(schema.properties).toHaveProperty('title');
    expect(schema.required).toContain('title');
  });

  it('expands the query schema into query parameters', () => {
    expect(parameter('verbose')).toMatchObject({
      in: 'query',
      required: false,
    });
  });

  it('converts the path parameter', () => {
    expect(parameter('id')).toMatchObject({
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    });
  });

  it('converts the response schema', () => {
    const response = operation().responses['201'] as {
      content: Record<string, { schema: unknown }>;
    };
    const schema = component(response.content['application/json'].schema);
    expect(Object.keys(schema.properties!)).toEqual(['id', 'title']);
  });
});
