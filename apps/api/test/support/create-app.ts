import type { INestApplication, Type } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../../src/common/configure-app.js';
import {
  buildOpenApiDocument,
  setupDocs,
} from '../../src/openapi/build-document.js';

export interface CreateTestAppOptions {
  // Extra modules, such as the test-only FixtureModule.
  imports?: Type[];
  // Provider overrides, such as the database client in the database suite.
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
  // Serve /docs and /docs-json, as main.ts does outside production.
  docs?: boolean;
}

/**
 * Builds and initializes the app the way main.ts does (same options, same
 * CORS), so tests exercise the production HTTP setup.
 */
export async function createTestApp({
  imports = [],
  override = (builder) => builder,
  docs = false,
}: CreateTestAppOptions = {}): Promise<INestApplication<App>> {
  const moduleRef = await override(
    Test.createTestingModule({ imports: [AppModule, ...imports] }),
  ).compile();
  const app =
    moduleRef.createNestApplication<INestApplication<App>>(APP_OPTIONS);
  configureApp(app);
  if (docs) setupDocs(app, buildOpenApiDocument(app));
  await app.init();
  return app;
}
