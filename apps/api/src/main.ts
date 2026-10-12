import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import {
  buildOpenApiDocument,
  DOCS_JSON_PATH,
  DOCS_PATH,
  setupDocs,
} from './openapi/build-document.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Runs onApplicationShutdown on SIGTERM/SIGINT, which closes the database pool.
  app.enableShutdownHooks();
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  const docsEnabled =
    config.get('NODE_ENV', { infer: true }) !== 'production' ||
    config.get('SWAGGER_UI', { infer: true });

  if (docsEnabled) {
    setupDocs(app, buildOpenApiDocument(app));
  }

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  const url = `http://localhost:${port}`;
  logger.log(`API listening on ${url}`);
  if (docsEnabled) {
    logger.log(`Swagger UI: ${url}/${DOCS_PATH}`);
    logger.log(`OpenAPI JSON: ${url}/${DOCS_JSON_PATH}`);
  }
}
await bootstrap();
