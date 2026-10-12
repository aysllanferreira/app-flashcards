import type { Page, TestInfo } from "@playwright/test";

export const THEMES = ["light", "dark"] as const;

/**
 * Saves a full-page screenshot of `path` in `theme` as
 * design/decks-and-cards/screenshots/<set>/<name>-<project>-<theme>.png.
 */
export async function capture(
  page: Page,
  testInfo: TestInfo,
  { set, name, path, theme, ready }: {
    set: string;
    name: string;
    path: string;
    theme: (typeof THEMES)[number];
    ready?: (page: Page) => Promise<unknown>;
  },
) {
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
  await page.goto(path);
  await ready?.(page);
  // Signed-in pages: Clerk mounts the avatar on the client.
  if (await page.locator(".cl-userButtonTrigger, .cl-userButtonBox").count() === 0) {
    await page
      .locator(".cl-userButtonTrigger")
      .waitFor({ timeout: 5000 })
      .catch(() => {});
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `../../design/decks-and-cards/screenshots/${set}/${name}-${testInfo.project.name}-${theme}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
