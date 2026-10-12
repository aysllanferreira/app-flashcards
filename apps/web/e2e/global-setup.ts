import { clerkSetup } from "@clerk/testing/playwright";
import { hasTestUser } from "./support/signed-in";

// Fetches a Clerk testing token (bot protection off for test sign-ins) when
// the signed-in tests will run. Needs CLERK_SECRET_KEY from .env.local.
export default async function globalSetup() {
  if (!hasTestUser) return;
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });
}
