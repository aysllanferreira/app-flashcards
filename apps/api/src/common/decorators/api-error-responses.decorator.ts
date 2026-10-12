import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseSchema } from '../dto/error-response.dto.js';

/**
 * Documents the error statuses a route can return, all with the shared
 * `ErrorResponse` body: 500 on every route, plus 400 on routes that take
 * input (`badRequest: true`).
 */
export function ApiErrorResponses({ badRequest = false } = {}) {
  return applyDecorators(
    ...(badRequest
      ? [
          ApiResponse({
            status: 400,
            description: 'Invalid request',
            standardSchema: ErrorResponseSchema,
          }),
        ]
      : []),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      standardSchema: ErrorResponseSchema,
    }),
  );
}
