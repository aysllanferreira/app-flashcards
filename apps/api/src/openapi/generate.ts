import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { buildOpenApiDocument } from './build-document.js';

// Writes the committed contract, apps/api/openapi.json. Run it with
// `pnpm --filter api openapi`, which builds first: Node can't run Nest's
// decorators from TypeScript source. Never edit openapi.json by hand.
const OUTPUT = fileURLToPath(new URL('../../openapi.json', import.meta.url));

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = buildOpenApiDocument(app);
  writeFileSync(OUTPUT, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(`Wrote ${OUTPUT}`);
}

await generate();
