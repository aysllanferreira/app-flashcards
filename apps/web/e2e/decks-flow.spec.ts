import { expect, type Page, test } from "@playwright/test";
import { deleteDecks, requireTestUser, runPrefix, scopePrefix, signIn } from "./support/signed-in";

requireTestUser();
// One user's data, step by step: run it once, at desktop width.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "The flow runs once, on desktop");

const scope = scopePrefix("flow", "desktop");
const prefix = runPrefix(scope);
const SPANISH = `${prefix} Spanish`;

// Before and after: a failed run can leave decks behind.
async function cleanUp({ browser }: { browser: import("@playwright/test").Browser }) {
  if (!process.env.E2E_CLERK_USER_EMAIL) return;
  const page = await browser.newPage();
  await signIn(page);
  await deleteDecks(page, scope);
  await page.close();
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

/** The deck's new-card count (subdecks included) on the deck list. */
async function newCount(page: Page, name: string) {
  await page.goto("/decks");
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) });
  return Number((await row.getByRole("cell").nth(1).textContent())?.replace(/\D/g, ""));
}

async function chooseNoteType(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Note type" }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

async function rowActions(page: Page, card: string) {
  await page.getByRole("table").getByRole("button", { name: `Actions for ${card}` }).click();
}

test("create, edit, move and delete decks, notes and cards", async ({ page }) => {
  await signIn(page);

  // 1. A deck and a subdeck.
  await page.getByRole("button", { name: "New deck" }).first().click();
  await page.getByLabel("Name").fill(SPANISH);
  await page.getByRole("button", { name: "Create deck" }).click();
  await expect(page.getByRole("link", { name: SPANISH })).toBeVisible();
  expect(await newCount(page, SPANISH)).toBe(0);

  await page.getByRole("link", { name: SPANISH }).click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}$/);
  const deckUrl = page.url();
  await page.getByRole("button", { name: "New subdeck" }).click();
  await page.getByLabel("Name").fill("Verbs");
  await page.getByRole("button", { name: "Create deck" }).click();
  await expect(page.getByRole("link", { name: "Verbs" })).toBeVisible();

  // 2. A Basic (and reversed card) note: the preview shows 2 cards first.
  await page.getByRole("link", { name: "Add note" }).first().click();
  await chooseNoteType(page, "Basic (and reversed card)");
  await page.getByRole("textbox", { name: "Front" }).click();
  await page.keyboard.type("hola");
  await page.getByRole("textbox", { name: "Back" }).click();
  await page.keyboard.type("hello");
  await expect(page.getByRole("complementary", { name: "Preview" })).toContainText("2 cards");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page).toHaveURL(deckUrl);
  expect(await newCount(page, SPANISH)).toBe(2);

  // 3. A Cloze note with c1 and c2, made with the Cloze action.
  await page.goto(`${deckUrl.replace(/.*\/decks\//, "/notes/new?deckId=")}`);
  await chooseNoteType(page, "Cloze");
  const text = page.getByRole("textbox", { name: "Text" });
  await text.click();
  await page.keyboard.type("Madrid is the capital of Spain.");
  const cloze = page.getByRole("button", { name: "[…] Cloze" });
  await page.keyboard.press("Home");
  for (let i = 0; i < "Madrid".length; i++) await page.keyboard.press("Shift+ArrowRight");
  await cloze.click();
  await text.click();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  for (let i = 0; i < "Spain".length; i++) await page.keyboard.press("Shift+ArrowLeft");
  await cloze.click();
  await expect(text).toContainText("{{c1::Madrid}} is the capital of {{c2::Spain}}.");
  await expect(page.getByRole("complementary", { name: "Preview" })).toContainText("2 cards");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page).toHaveURL(deckUrl);
  expect(await newCount(page, SPANISH)).toBe(4);

  // 4. Four cards in the browser.
  const deckId = deckUrl.split("/").pop();
  await page.goto(`/cards?deckId=${deckId}`);
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(5); // header + 4

  // 5. Edit a note.
  await rowActions(page, "hola, Card 1");
  await page.getByRole("menuitem", { name: "Edit note" }).click();
  await page.getByRole("textbox", { name: "Back" }).click();
  await page.keyboard.press("End");
  await page.keyboard.type(" there");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Note saved")).toBeVisible();
  expect(await newCount(page, SPANISH)).toBe(4);

  // 6. Move a card to the subdeck.
  await page.goto(`/cards?deckId=${deckId}`);
  await rowActions(page, "hola, Card 2");
  await page.getByRole("menuitem", { name: "Move to deck" }).click();
  await page.getByRole("combobox", { name: "Deck" }).last().click();
  await page.getByRole("option", { name: `${SPANISH} › Verbs` }).click();
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row").filter({ hasText: "Card 2" })).toContainText("Verbs");
  expect(await newCount(page, SPANISH)).toBe(4);
  expect(await newCount(page, "Verbs")).toBe(1);

  // 7. Delete a note: both of its cards go.
  await page.goto(`/cards?deckId=${deckId}`);
  await rowActions(page, "Madrid is the capital of Spain., Cloze 1");
  await page.getByRole("menuitem", { name: "Delete note" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("2 cards");
  await confirm.getByRole("button", { name: "Delete note" }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(3); // header + 2
  expect(await newCount(page, SPANISH)).toBe(2);

  // 8. Delete the deck with its subdeck.
  await page.goto(deckUrl);
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete deck" }).click();
  const deleteDeck = page.getByRole("alertdialog");
  await expect(deleteDeck).toContainText(/1\s*subdeck/);
  await deleteDeck.getByRole("button", { name: "Delete deck" }).click();
  await expect(page).toHaveURL(/\/decks$/);
  await expect(page.getByRole("link", { name: SPANISH })).toHaveCount(0);
});
