import { verifyToken } from '@clerk/backend';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';

/**
 * Verifies Clerk session tokens. With CLERK_JWT_KEY it needs no network;
 * otherwise it fetches and caches Clerk's JWKS with CLERK_SECRET_KEY. The
 * token's authorized party (azp) must be one of WEB_ORIGIN.
 */
@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * The Clerk user id (`sub`) of a valid session token from an
   * `Authorization` header value. Throws 401 for anything else.
   */
  async verifyAuthorization(
    authorization: string | undefined,
  ): Promise<string> {
    const token = /^Bearer (\S+)$/.exec(authorization ?? '')?.[1];
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const jwtKey = this.config.get('CLERK_JWT_KEY', { infer: true });
    const secretKey = this.config.get('CLERK_SECRET_KEY', { infer: true });
    if (!jwtKey && !secretKey) {
      throw new UnauthorizedException(
        'Token verification is not configured on this server',
      );
    }

    try {
      const payload = await verifyToken(token, {
        ...(jwtKey ? { jwtKey } : { secretKey }),
        authorizedParties: this.config.get('WEB_ORIGIN', { infer: true }),
      });
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired session token');
    }
  }
}
