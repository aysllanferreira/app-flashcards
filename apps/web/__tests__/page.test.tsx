import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Home from "../app/page";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.userId }),
}));

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

afterEach(() => {
  cleanup();
  session.userId = null;
  redirect.mockClear();
});

// An async server component: await it, then render what it returns.
const renderHome = async () => render(<>{await Home()}</>);

test("renders the landing page for signed-out visitors", async () => {
  await renderHome();

  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading.textContent).toBe("Remember what you study.");
  expect(
    screen.getByRole("link", { name: "Create your account" }).getAttribute("href"),
  ).toBe("/sign-up");
  expect(redirect).not.toHaveBeenCalled();
});

test("sends signed-in users to their decks", async () => {
  session.userId = "user_1";

  await expect(renderHome()).rejects.toThrow("NEXT_REDIRECT /decks");
});
