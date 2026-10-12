import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { zodSchemaConverter } from './zod-converter.js';

export const DOCS_PATH = 'docs';
export const DOCS_JSON_PATH = 'docs-json';

// The contract version, not the release tag: it changes only when the API
// contract is deliberately versioned, so the committed openapi.json doesn't
// churn on every release.
const CONTRACT_VERSION = '0.1.0';

/**
 * Builds the OpenAPI document for an app. main.ts, the openapi.json generator
 * and the tests all call this, so they can't produce different documents.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Flashcards API')
    .setDescription('REST API for the flashcards app.')
    .setVersion(CONTRACT_VERSION)
    .setOpenAPIVersion('3.1.0')
    .build();

  return SwaggerModule.createDocument(app, config, {
    standardSchemaConverter: zodSchemaConverter,
  });
}

/** Serves Swagger UI at /docs and the JSON document at /docs-json. */
export function setupDocs(app: INestApplication, document: OpenAPIObject) {
  SwaggerModule.setup(DOCS_PATH, app, document, {
    jsonDocumentUrl: DOCS_JSON_PATH,
  });
}
