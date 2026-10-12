import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseSchema } from '../dto/error-response.dto.js';

/**
 * Documents the error statuses a route can return, all with the shared
 * `ErrorResponse` body: 500 on every route, plus 400 on routes that take
 * input (`badRequest: true`), 401 on routes that need a session token
 * (`unauthorized: true`, every route that isn't @Public()), 404 on routes
 * that address a record by id or name one in their input (`notFound: true`)
 * and 409 on routes that can conflict with an existing record
 * (`conflict: true`).
 */
export function ApiErrorResponses({
  badRequest = false,
  unauthorized = false,
  notFound = false,
  conflict = false,
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
    ...(notFound
      ? [
          ApiResponse({
            status: 404,
            description: 'Not found, or not owned by the caller',
            standardSchema: ErrorResponseSchema,
          }),
        ]
      : []),
    ...(conflict
      ? [
          ApiResponse({
            status: 409,
            description: 'Conflicts with an existing record',
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
