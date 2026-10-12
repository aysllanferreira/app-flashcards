import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';

// Signs Clerk-shaped tokens locally so tests never call Clerk. The API is
// given the public key as CLERK_JWT_KEY (test/support/env.ts), which makes
// verification networkless, exactly as in production.
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

export const TEST_JWT_PUBLIC_KEY = publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString();

export const TEST_WEB_ORIGIN = 'http://localhost:3000';

const base64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export interface SessionTokenClaims {
  sub: string;
  azp?: string;
  // Seconds since the epoch. Defaults: issued now, valid for 60 s.
  iat?: number;
  nbf?: number;
  exp?: number;
}

/** An RS256 session token with the claims Clerk puts in its session tokens. */
export function signSessionToken(claims: SessionTokenClaims): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', kid: 'ins_test' };
  const payload = {
    azp: TEST_WEB_ORIGIN,
    iss: 'https://clerk.test.example',
    sid: `sess_${randomUUID()}`,
    iat: now,
    nbf: now - 5,
    exp: now + 60,
    v: 2,
    ...claims,
  };
  const signingInput = `${base64url(header)}.${base64url(payload)}`;
  const signature = sign('sha256', Buffer.from(signingInput), privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
}
