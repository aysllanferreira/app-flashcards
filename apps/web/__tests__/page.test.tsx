import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import Home from "../app/page";

// An async server component, covered on its own in account-summary.test.tsx.
vi.mock("../app/_components/account-summary", () => ({
  AccountSummary: () => null,
}));

test("renders the home page heading", () => {
  render(<Home />);

  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading.textContent).toContain("To get started");
});
