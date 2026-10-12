import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { buildOpenApiDocument } from '../src/openapi/build-document.js';

// Fails when the committed contract no longer matches the code. The fix is to
// regenerate it, never to edit it by hand.
const OPENAPI_JSON = fileURLToPath(new URL('../openapi.json', import.meta.url));

describe('openapi.json', () => {
  it('matches the document built from the code', async () => {
    const app = await NestFactory.create(AppModule, { logger: false });
    const built = JSON.parse(JSON.stringify(buildOpenApiDocument(app)));
    await app.close();

    const committed = JSON.parse(readFileSync(OPENAPI_JSON, 'utf8'));
    expect(
      committed,
      'apps/api/openapi.json is out of date: run `pnpm --filter api openapi` and commit the result',
    ).toEqual(built);
  });
});

describe('authenticated operations', () => {
  it('document a 401 ErrorResponse (use @ApiErrorResponses({ unauthorized: true }))', async () => {
    const app = await NestFactory.create(AppModule, { logger: false });
    const doc = buildOpenApiDocument(app);
    await app.close();

    const missing: string[] = [];
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(item)) {
        if (typeof operation !== 'object' || !('responses' in operation)) {
          continue;
        }
        // An operation without its own `security` inherits the document's.
        const security = operation.security ?? doc.security ?? [];
        if (security.length > 0 && !operation.responses['401']) {
          missing.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
