import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  signSessionToken,
  TEST_JWT_PUBLIC_KEY,
  TEST_WEB_ORIGIN,
} from '../../../test/support/clerk.js';
import type { Env } from '../../config/env.js';
import { AuthService } from './auth.service.js';

const service = (env: Partial<Env> = {}) => {
  const values: Partial<Env> = {
    CLERK_JWT_KEY: TEST_JWT_PUBLIC_KEY,
    WEB_ORIGIN: [TEST_WEB_ORIGIN],
    ...env,
  };
  const config = {
    get: (key: keyof Env) => values[key],
  } as unknown as ConfigService<Env, true>;
  return new AuthService(config);
};

const bearer = (token: string) => `Bearer ${token}`;

describe('AuthService.verifyAuthorization', () => {
  it('returns the Clerk user id of a valid token', async () => {
    const token = signSessionToken({ sub: 'user_valid' });
    await expect(service().verifyAuthorization(bearer(token))).resolves.toBe(
      'user_valid',
    );
  });

  it.each([
    ['a missing header', undefined],
    ['a non-bearer header', 'Basic dXNlcjpwYXNz'],
    ['a malformed token', 'Bearer not-a-jwt'],
  ])('rejects %s with 401', async (_case, header) => {
    await expect(service().verifyAuthorization(header)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired token with 401', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signSessionToken({
      sub: 'user_expired',
      iat: now - 600,
      nbf: now - 600,
      exp: now - 300,
    });
    await expect(
      service().verifyAuthorization(bearer(token)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token from an origin outside WEB_ORIGIN with 401', async () => {
    const token = signSessionToken({
      sub: 'user_foreign',
      azp: 'https://evil.example',
    });
    await expect(
      service().verifyAuthorization(bearer(token)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects every token with 401 when no verification key is configured', async () => {
    const token = signSessionToken({ sub: 'user_valid' });
    await expect(
      service({
        CLERK_JWT_KEY: undefined,
        CLERK_SECRET_KEY: undefined,
      }).verifyAuthorization(bearer(token)),
    ).rejects.toThrow(/not configured/);
  });
});
