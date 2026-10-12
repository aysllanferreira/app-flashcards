import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { apiFetch } from "../app/_lib/api";

const getToken = vi.fn<() => Promise<string | null>>();
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ getToken }),
}));

const fetchMock = vi.fn(async () => new Response("{}"));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const lastRequest = () => {
  const [url, init] = fetchMock.mock.lastCall as unknown as [
    string,
    RequestInit,
  ];
  return { url, headers: new Headers(init.headers) };
};

test("sends the session token as a bearer token", async () => {
  getToken.mockResolvedValue("abc");

  await apiFetch("/me");

  const { url, headers } = lastRequest();
  expect(url).toBe("http://localhost:3001/me");
  expect(headers.get("Authorization")).toBe("Bearer abc");
});

test("sends no Authorization header when signed out", async () => {
  getToken.mockResolvedValue(null);

  await apiFetch("/me");

  expect(lastRequest().headers.has("Authorization")).toBe(false);
});

test("uses API_URL as the base URL", async () => {
  vi.stubEnv("API_URL", "https://api.example.com/");
  getToken.mockResolvedValue("abc");

  await apiFetch("/me");

  expect(lastRequest().url).toBe("https://api.example.com/me");
});
