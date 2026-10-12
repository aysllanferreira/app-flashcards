import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { api, deleteDecks, requireTestUser, runPrefix, scopePrefix, signIn } from "./support/signed-in";

requireTestUser();
test.describe.configure({ mode: "serial" });

const THEMES = ["light", "dark"] as const;

type Seeded = { deckId: string; noteId: string };
let seeded: Seeded;
let scope: string;

// One deck with a subdeck and two notes for every screen to show. Each
// project (phone, desktop) seeds and cleans up its own.
test.beforeAll(async ({ browser }, testInfo) => {
  scope = scopePrefix("screens", testInfo.project.name);
  const page = await browser.newPage();
  await signIn(page);
  // A failed run can leave decks behind.
  await deleteDecks(page, scope);
  const deck = await api<{ id: string }>(page, "POST", "/decks", { name: `${runPrefix(scope)} Screens` });
  await api(page, "POST", "/decks", { name: "Verbs", parentId: deck.id });
  const { noteTypes } = await api<{ noteTypes: { id: string; name: string }[] }>(page, "GET", "/note-types");
  const id = (name: string) => noteTypes.find((nt) => nt.name === name)!.id;
  const note = await api<{ id: string }>(page, "POST", "/notes", {
    noteTypeId: id("Basic (and reversed card)"),
    deckId: deck.id,
    fields: { "1": "la berenjena", "2": "the eggplant" },
  });
  await api(page, "POST", "/notes", {
    noteTypeId: id("Cloze"),
    deckId: deck.id,
    fields: { "1": "{{c1::Madrid}} is the capital of {{c2::Spain}}." },
  });
  seeded = { deckId: deck.id, noteId: note.id };
  await page.close();
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  await deleteDecks(page, scope);
  await page.close();
});

const routes = () => [
  "/decks",
  `/decks/${seeded.deckId}`,
  "/notes/new",
  `/notes/${seeded.noteId}/edit`,
  "/cards",
];

async function open(page: Page, path: string, theme: (typeof THEMES)[number]) {
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
  await page.goto(path);
  await page.getByRole("heading", { level: 1 }).waitFor();
  // The note editor and preview render on the client.
  if (path.startsWith("/notes")) await page.getByRole("complementary", { name: "Preview" }).waitFor();
}

for (const theme of THEMES) {
  test(`every screen fits and passes axe in ${theme}`, async ({ page }) => {
    // Five screens, each with an axe scan.
    test.setTimeout(120_000);
    await signIn(page);
    for (const path of routes()) {
      await test.step(`${path}: open and measure`, async () => {
        await open(page, path, theme);
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth, `${path} scrolls sideways`).toBeLessThanOrEqual(clientWidth);
      });

      await test.step(`${path}: axe`, async () => {
        // The card preview frames run no scripts (sandboxed), so axe can't run
        // inside them, and the builder's own frame walk would wait forever.
        // Legacy mode leaves frames to axe, which skips them with
        // iframes: false. Their content is the note type's card, not app UI.
        const { violations, passes } = await new AxeBuilder({ page })
          .setLegacyMode(true)
          .options({ iframes: false })
          .analyze();
        // The scan really ran: rules were checked against the page.
        expect(passes.length, `axe checked nothing on ${path}`).toBeGreaterThan(10);
        const serious = violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
        expect(serious, `${path} in ${theme}`).toEqual([]);
      });
    }
  });
}

test("the deck list and the note editor work with the keyboard alone", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard use is a desktop concern");
  await signIn(page);

  // Deck list: Tab to "New deck", open it with Enter, close it with Escape.
  await page.goto("/decks");
  const newDeck = page.getByRole("button", { name: "New deck" }).first();
  for (let i = 0; i < 30 && !(await newDeck.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(newDeck).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  // Editor: Tab into the first field, type, and reach Save note.
  await page.goto(`/notes/new?deckId=${seeded.deckId}`);
  const front = page.getByRole("textbox", { name: "Front" });
  for (let i = 0; i < 30 && !(await front.evaluate((el) => el === document.activeElement || el.contains(document.activeElement))); i++) {
    await page.keyboard.press("Tab");
  }
  await page.keyboard.type("hola");
  await expect(page.getByRole("complementary", { name: "Preview" })).toContainText("1 card");
  const save = page.getByRole("button", { name: "Save note" });
  for (let i = 0; i < 30 && !(await save.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(save).toBeFocused();
});
