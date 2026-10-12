import type { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/**
 * Options every app instance is created with. `rawBody` keeps the request's
 * raw bytes next to the parsed JSON, which webhook signature checks need.
 */
export const APP_OPTIONS = { rawBody: true } satisfies NestApplicationOptions;

/**
 * Applies the HTTP setup that isn't part of AppModule. main.ts, the
 * openapi.json generator and the tests all call it, so tests exercise the
 * same CORS policy as production.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  // Browsers may call the API only from the web app's origins.
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
}
