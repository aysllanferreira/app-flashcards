import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseSchema } from '../dto/error-response.dto.js';

/**
 * Documents the error statuses a route can return, all with the shared
 * `ErrorResponse` body: 500 on every route, plus 400 on routes that take
 * input (`badRequest: true`) and 401 on routes that need a session token
 * (`unauthorized: true`, every route that isn't @Public()).
 */
export function ApiErrorResponses({
  badRequest = false,
  unauthorized = false,
} = {}) {
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
    ...(unauthorized
      ? [
          ApiResponse({
            status: 401,
            description: 'Missing, invalid or expired session token',
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
