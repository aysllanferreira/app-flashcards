import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/sign-in", "/sign-up"] as const;
const THEMES = ["light", "dark"] as const;

// Clerk renders its forms on the client; wait for them before measuring.
async function open(page: Page, path: string, theme: (typeof THEMES)[number]) {
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
  await page.goto(path);
  if (path !== "/") await page.locator(".cl-rootBox").waitFor();
}

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`${path} in ${theme} has no horizontal scroll`, async ({ page }) => {
      await open(page, path, theme);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }

  test(`${path} puts the navigation where the width allows`, async ({
    page,
    isMobile,
  }) => {
    await open(page, path, "light");
    const decks = page.getByRole("link", { name: "Decks" });
    const menu = page.getByRole("button", { name: "Open navigation" });

    if (isMobile) {
      await expect(decks).toBeHidden();
      await menu.click();
      await expect(page.getByRole("dialog").getByRole("link", { name: "Decks" })).toBeVisible();
    } else {
      await expect(menu).toBeHidden();
      await expect(decks).toBeVisible();
    }
  });
}

test("the sign-in form uses the theme's card color", async ({ page }) => {
  await open(page, "/sign-in", "dark");

  const colors = await page.evaluate(() => {
    const card = document.querySelector(".cl-card") as HTMLElement;
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--card)";
    document.body.append(probe);
    return {
      form: getComputedStyle(card).backgroundColor,
      token: getComputedStyle(probe).backgroundColor,
    };
  });
  expect(colors.form).toBe(colors.token);
  expect(colors.form).not.toBe("rgb(255, 255, 255)");
});
