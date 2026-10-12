import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { Webhook } from 'svix';

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

// The signing secret of the test webhook endpoint (CLERK_WEBHOOK_SIGNING_SECRET
// in test/support/env.ts). Svix secrets are base64 after the whsec_ prefix.
export const TEST_WEBHOOK_SECRET = `whsec_${Buffer.from(
  'test-webhook-signing-secret-32b!',
).toString('base64')}`;

export interface SignedWebhook {
  body: string;
  headers: Record<'svix-id' | 'svix-timestamp' | 'svix-signature', string>;
}

/** A webhook request body and the Svix headers Clerk would send with it. */
export function signWebhook(
  event: object,
  { secret = TEST_WEBHOOK_SECRET, id = `msg_${randomUUID()}` } = {},
): SignedWebhook {
  const body = JSON.stringify(event);
  const timestamp = new Date();
  return {
    body,
    headers: {
      'svix-id': id,
      'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'svix-signature': new Webhook(secret).sign(id, timestamp, body),
    },
  };
}

// Clerk webhook events, trimmed to the fields the API reads.
const event = (type: string, data: object) => ({
  object: 'event',
  type,
  data,
  timestamp: Date.now(),
  instance_id: 'ins_test',
});

/** A user.created or user.updated event; email null means no addresses. */
export function userEvent(
  type: 'user.created' | 'user.updated',
  clerkUserId: string,
  email: string | null,
) {
  const addresses = email
    ? [
        { id: 'idn_other', email_address: `other+${email}` },
        { id: 'idn_primary', email_address: email },
      ]
    : [];
  return event(type, {
    object: 'user',
    id: clerkUserId,
    email_addresses: addresses,
    primary_email_address_id: email ? 'idn_primary' : null,
  });
}

export function userDeletedEvent(clerkUserId: string) {
  return event('user.deleted', {
    object: 'user',
    id: clerkUserId,
    deleted: true,
  });
}

export function sessionCreatedEvent(clerkUserId: string) {
  return event('session.created', {
    object: 'session',
    id: `sess_${randomUUID()}`,
    user_id: clerkUserId,
  });
}
