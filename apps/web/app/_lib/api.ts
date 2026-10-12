import "server-only";
import { auth } from "@clerk/nextjs/server";

// The API started by `pnpm --filter api dev`.
const LOCAL_API_URL = "http://localhost:3001";

/** The API's base URL: API_URL, or the local API outside production. */
export function apiBaseUrl(): string {
  const url = process.env.API_URL;
  if (url) return url.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("API_URL is required in production");
  }
  return LOCAL_API_URL;
}

/**
 * Calls the API from server-side code as the signed-in user: sends the Clerk
 * session token as a bearer token, and no Authorization header when signed
 * out. Never cached, because responses are per user.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { getToken } = await auth();
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
