import { verifyToken } from '@clerk/backend';
import {
  signSessionToken,
  TEST_JWT_PUBLIC_KEY,
  TEST_WEB_ORIGIN,
} from './clerk.js';

// The e2e and database suites rely on these tokens passing Clerk's own
// verification, so check that here against the real verifier.
const verify = (token: string) =>
  verifyToken(token, {
    jwtKey: TEST_JWT_PUBLIC_KEY,
    authorizedParties: [TEST_WEB_ORIGIN],
  });

describe('test session tokens', () => {
  it('pass verifyToken with the test public key', async () => {
    const payload = await verify(signSessionToken({ sub: 'user_test' }));
    expect(payload.sub).toBe('user_test');
  });

  it('are rejected once expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signSessionToken({
      sub: 'user_test',
      iat: now - 600,
      nbf: now - 600,
      exp: now - 300,
    });
    await expect(verify(token)).rejects.toThrow(/expired/);
  });

  it('are rejected when azp is not an authorized party', async () => {
    const token = signSessionToken({
      sub: 'user_test',
      azp: 'https://evil.example',
    });
    await expect(verify(token)).rejects.toThrow(/Authorized party/);
  });
});
