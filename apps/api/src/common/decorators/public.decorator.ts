import { applyDecorators, SetMetadata } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Marks a route, or every route of a controller, as callable without a
 * session token: the global auth guard skips it, and the OpenAPI operation
 * declares `security: []` instead of inheriting the document's bearer
 * requirement. Only for health, docs and signed third-party callbacks such as
 * webhooks.
 */
export function Public() {
  return applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    (
      target: object,
      _key?: string | symbol,
      descriptor?: PropertyDescriptor,
    ) => {
      // @nestjs/swagger reads operation security from this metadata as-is, so
      // an empty list becomes `security: []`.
      Reflect.defineMetadata(
        DECORATORS.API_SECURITY,
        [],
        descriptor?.value ?? target,
      );
    },
  );
}
