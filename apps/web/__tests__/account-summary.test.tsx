import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AccountSummary } from "../app/_components/account-summary";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({
    userId: session.userId,
    getToken: async () => (session.userId ? "token" : null),
  }),
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  session.userId = null;
});

const me = (email: string | null) =>
  new Response(
    JSON.stringify({
      id: "0192f7e0-0000-7000-8000-000000000000",
      email,
      timezone: "UTC",
      dayRolloverHour: 4,
      remindersOn: true,
      createdAt: "2026-10-12T00:00:00.000Z",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

// An async server component: await it, then render what it returns.
const renderSummary = async () => render(<>{await AccountSummary()}</>);

test("renders nothing when signed out, without calling the API", async () => {
  const { container } = await renderSummary();

  expect(container.innerHTML).toBe("");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("shows the email and time zone from GET /me", async () => {
  session.userId = "user_1";
  fetchMock.mockResolvedValue(me("learner@example.com"));

  await renderSummary();

  expect(screen.getByText("learner@example.com")).toBeTruthy();
  expect(screen.getByText("Time zone: UTC")).toBeTruthy();
  expect(String(fetchMock.mock.lastCall?.[0])).toMatch(/\/me$/);
});

test("shows a fallback label when the account has no email yet", async () => {
  session.userId = "user_1";
  fetchMock.mockResolvedValue(me(null));

  await renderSummary();

  expect(screen.getByText("No email yet")).toBeTruthy();
});

test.each([
  ["the API can't be reached", () => fetchMock.mockRejectedValue(new TypeError("fetch failed"))],
  ["the API answers 500", () => fetchMock.mockResolvedValue(new Response("", { status: 500 }))],
])("shows a message when %s", async (_case, arrange) => {
  session.userId = "user_1";
  arrange();

  await renderSummary();

  expect(
    screen.getByText("Couldn't load your account right now."),
  ).toBeTruthy();
});
