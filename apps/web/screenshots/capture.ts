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
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `../../design/decks-and-cards/screenshots/${set}/${name}-${testInfo.project.name}-${theme}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
