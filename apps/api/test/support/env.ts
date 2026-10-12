import {
  TEST_JWT_PUBLIC_KEY,
  TEST_WEB_ORIGIN,
  TEST_WEBHOOK_SECRET,
} from './clerk.js';

// Runs before each e2e and database test file (setupFiles), so AppModule's
// ConfigModule validates an environment that verifies the locally signed test
// tokens and webhooks. Values set here win over apps/api/.env.
process.env.CLERK_JWT_KEY = TEST_JWT_PUBLIC_KEY;
process.env.WEB_ORIGIN = TEST_WEB_ORIGIN;
process.env.CLERK_WEBHOOK_SIGNING_SECRET = TEST_WEBHOOK_SECRET;
delete process.env.CLERK_SECRET_KEY;
