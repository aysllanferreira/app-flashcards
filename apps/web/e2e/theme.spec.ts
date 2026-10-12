import { expect, test, type Page } from "@playwright/test";

const html = (page: Page) => page.locator("html");

async function chooseTheme(page: Page, label: "Light" | "Dark" | "System") {
  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitemradio", { name: label }).click();
}

test("the chosen theme survives a reload", async ({ page }) => {
  await page.goto("/");

  await chooseTheme(page, "Dark");
  await page.reload();
  await expect(html(page)).toHaveClass(/\bdark\b/);

  await chooseTheme(page, "Light");
  await page.reload();
  await expect(html(page)).toHaveClass(/\blight\b/);
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
});

test("system follows the browser's color scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  await chooseTheme(page, "System");
  await page.reload();
  await expect(html(page)).toHaveClass(/\bdark\b/);

  await page.emulateMedia({ colorScheme: "light" });
  await expect(html(page)).toHaveClass(/\blight\b/);
});

test("a stored dark theme is applied before the first paint", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "dark");
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.dataset.classAtDcl = document.documentElement.className;
    });
  });

  await page.goto("/");

  await expect(html(page)).toHaveAttribute("data-class-at-dcl", /\bdark\b/);
});
