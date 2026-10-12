import { STATUS_CODES } from 'node:http';
import { applyDecorators, SerializeOptions } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { ZodType } from 'zod';

/**
 * Declares a route's success response once, for both the docs and the
 * response serializer, so the documented schema is the one that shapes the
 * body. Use it once per route.
 */
export function ApiResponseSchema(
  status: number,
  schema: ZodType,
  description = STATUS_CODES[status] ?? '',
) {
  return applyDecorators(
    ApiResponse({ status, description, standardSchema: schema }),
    SerializeOptions({ schema }),
  );
}
