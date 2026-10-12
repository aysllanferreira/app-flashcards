import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Home from "../app/page";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.userId }),
}));

// An async server component, covered on its own in account-summary.test.tsx.
vi.mock("../app/_components/account-summary", () => ({
  AccountSummary: () => null,
}));

afterEach(() => {
  cleanup();
  session.userId = null;
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
});

test("welcomes signed-in users and links to their decks", async () => {
  session.userId = "user_1";

  await renderHome();

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome back");
  expect(
    screen.getByRole("link", { name: "Go to your decks" }).getAttribute("href"),
  ).toBe("/decks");
});
