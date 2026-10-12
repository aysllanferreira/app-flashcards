import type { StandardSchemaConverter } from '@nestjs/swagger';
import type { ZodType } from 'zod';
import { createSchema } from 'zod-openapi';

// Standard Schema names the library that produced a schema in
// `~standard.vendor`; that is how a raw schema is narrowed to Zod.
function isZodSchema(schema: unknown): schema is ZodType {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    (schema as { '~standard'?: { vendor?: string } })['~standard']?.vendor ===
      'zod'
  );
}

/**
 * Turns the Zod schemas declared on routes (`@Body/@Query/@Param({ schema })`,
 * `@ApiResponse({ standardSchema })`) into OpenAPI schemas. Schemas with
 * `.meta({ id })` become named components referenced with `$ref`.
 */
export const zodSchemaConverter: StandardSchemaConverter = (
  schema,
  { schemaType },
) => {
  if (!isZodSchema(schema)) return undefined;
  const { schema: converted, components } = createSchema(schema, {
    io: schemaType,
  });
  return { schema: converted, components };
};
