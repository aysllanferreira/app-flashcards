import { expect, test } from "@playwright/test";

const SOME_ID = "0192f7e0-0000-7000-8000-000000000000";
const PRIVATE = ["/decks", `/decks/${SOME_ID}`, "/notes/new", `/notes/${SOME_ID}/edit`, "/cards"];

for (const path of PRIVATE) {
  test(`${path} sends signed-out visitors to /sign-in and back`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/sign-in/);
    const back = new URL(page.url()).searchParams.get("redirect_url");
    expect(back && new URL(back).pathname).toBe(path);
  });
}

test("/ renders for signed-out visitors", async ({ page }) => {
  const res = await page.goto("/");

  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Remember what you study.");
});
