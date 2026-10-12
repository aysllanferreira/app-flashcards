import { clerk } from "@clerk/testing/playwright";
import { expect, type Page, test } from "@playwright/test";

// A test user of the Clerk development instance, from the git-ignored
// apps/web/.env.test.local. Without it the signed-in tests are skipped.
const EMAIL = process.env.E2E_CLERK_USER_EMAIL;
export const hasTestUser = Boolean(EMAIL);

/** Skips the calling tests when no test user is configured. */
export function requireTestUser() {
  test.skip(!hasTestUser, "Set E2E_CLERK_USER_EMAIL in apps/web/.env.test.local");
}

/** Signs the page in as the test user. */
export async function signIn(page: Page) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: EMAIL! });
  await page.goto("/decks");
  await expect(page).toHaveURL(/\/decks$/);
}

const API = process.env.API_URL ?? "http://localhost:3001";

/** Calls the API as the signed-in page's user (for seeding and cleanup). */
export async function api<T = unknown>(
  page: Page,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  data?: object,
  { allowNotFound = false }: { allowNotFound?: boolean } = {},
): Promise<T> {
  // Clerk loads on the client; wait for its session before asking for a token.
  await clerk.loaded({ page });
  const token = await page.evaluate(async () => {
    const w = window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } };
    for (let i = 0; i < 50 && !w.Clerk?.session; i++) await new Promise((r) => setTimeout(r, 100));
    return w.Clerk!.session!.getToken();
  });
  const res = await page.request.fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  if (allowNotFound && res.status() === 404) return undefined as T;
  expect(res.ok(), `${method} ${path} answered ${res.status()}`).toBe(true);
  return (res.status() === 204 ? undefined : await res.json()) as T;
}

/**
 * The prefix of every deck one spec creates in one project ("E2E flow
 * desktop "). Specs and projects run in parallel as the same test user, so
 * each cleans up only its own decks, including a failed earlier run's.
 */
export const scopePrefix = (spec: string, project: string) => `E2E ${spec} ${project} `;

/** A per-run deck name prefix within a scope. */
export const runPrefix = (scope: string) => `${scope}${Date.now().toString(36)}`;

/**
 * Deletes the test user's top-level decks whose names start with `prefix`,
 * or are one of `prefix` when it is a list of exact names.
 */
export async function deleteDecks(page: Page, prefix: string | string[]) {
  const { decks } = await api<{ decks: { id: string; name: string; parentId: string | null }[] }>(page, "GET", "/decks");
  const matches = (name: string) =>
    typeof prefix === "string" ? name.startsWith(prefix) : prefix.includes(name);
  for (const deck of decks.filter((d) => d.parentId === null && matches(d.name))) {
    await api(page, "DELETE", `/decks/${deck.id}`, undefined, { allowNotFound: true });
  }
}
