import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  type OperationObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { zodSchemaConverter } from './zod-converter.js';

export const DOCS_PATH = 'docs';
export const DOCS_JSON_PATH = 'docs-json';

// The contract version, not the release tag: it changes only when the API
// contract is deliberately versioned, so the committed openapi.json doesn't
// churn on every release.
const CONTRACT_VERSION = '0.1.0';

// The security scheme of authenticated operations.
export const BEARER_SCHEME = 'bearer';

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
    // Every operation needs a Clerk session token unless its route is
    // @Public(), which declares `security: []` instead.
    .addBearerAuth(
      { type: 'http', description: 'A Clerk session token' },
      BEARER_SCHEME,
    )
    .addSecurityRequirements(BEARER_SCHEME)
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    standardSchemaConverter: zodSchemaConverter,
  });
  // Spell the inherited requirement out on each operation, so every
  // operation in the contract states its own security.
  for (const item of Object.values(document.paths)) {
    for (const operation of Object.values(item)) {
      if (isOperation(operation) && !operation.security) {
        operation.security = document.security;
      }
    }
  }
  return document;
}

const isOperation = (value: unknown): value is OperationObject =>
  typeof value === 'object' && value !== null && 'responses' in value;

/** Serves Swagger UI at /docs and the JSON document at /docs-json. */
export function setupDocs(app: INestApplication, document: OpenAPIObject) {
  SwaggerModule.setup(DOCS_PATH, app, document, {
    jsonDocumentUrl: DOCS_JSON_PATH,
  });
}
