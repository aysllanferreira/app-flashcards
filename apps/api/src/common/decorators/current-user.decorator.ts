import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '../../modules/users/provision-user.js';

// The request property the auth guard sets to the caller's users row.
export const CURRENT_USER_KEY = 'currentUser';

export type RequestWithUser = { [CURRENT_USER_KEY]?: User };

/**
 * The caller's `users` row, as resolved by the global auth guard. Routes read
 * the caller through it, never from the token.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request[CURRENT_USER_KEY];
    if (!user) {
      // Only reachable on a @Public() route, where no guard resolved a user.
      throw new Error('@CurrentUser() used on a route without a caller');
    }
    return user;
  },
);
