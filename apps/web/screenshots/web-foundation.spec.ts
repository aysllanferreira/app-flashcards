import { test } from "@playwright/test";
import { capture, THEMES } from "./capture";

// The #62 review set: the landing page and the themed sign-in form.
for (const theme of THEMES) {
  test(`home in ${theme}`, async ({ page }, testInfo) => {
    await capture(page, testInfo, { set: "web-foundation", name: "home", path: "/", theme });
  });

  test(`sign-in in ${theme}`, async ({ page }, testInfo) => {
    await capture(page, testInfo, {
      set: "web-foundation",
      name: "sign-in",
      path: "/sign-in",
      theme,
      ready: (p) => p.locator(".cl-card").waitFor(),
    });
  });
}
