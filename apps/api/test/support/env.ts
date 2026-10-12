import { TEST_JWT_PUBLIC_KEY, TEST_WEB_ORIGIN } from './clerk.js';

// Runs before each e2e and database test file (setupFiles), so AppModule's
// ConfigModule validates an environment that verifies the locally signed test
// tokens. Values set here win over apps/api/.env.
process.env.CLERK_JWT_KEY = TEST_JWT_PUBLIC_KEY;
process.env.WEB_ORIGIN = TEST_WEB_ORIGIN;
delete process.env.CLERK_SECRET_KEY;
