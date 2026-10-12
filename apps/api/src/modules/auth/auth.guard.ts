import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  CURRENT_USER_KEY,
  type RequestWithUser,
} from '../../common/decorators/current-user.decorator.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

/**
 * Global guard (APP_GUARD): every route needs a valid Clerk session token
 * unless it is @Public(). It resolves the caller's users row, provisioning
 * the account on its first request, and puts it on the request for
 * @CurrentUser().
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<
        RequestWithUser & { headers: Record<string, string | undefined> }
      >();
    const clerkUserId = await this.auth.verifyAuthorization(
      request.headers.authorization,
    );
    request[CURRENT_USER_KEY] = await this.users.ensureUser(clerkUserId);
    return true;
  }
}
