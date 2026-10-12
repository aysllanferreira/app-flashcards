import { test } from "@playwright/test";
import { api, deleteDecks, hasTestUser, signIn } from "../e2e/support/signed-in";
import { capture, THEMES } from "./capture";

// The #65 review set: the four screens with realistic content, as the test
// user. Run with `pnpm --filter web screenshots`.
test.skip(!hasTestUser, "Set E2E_CLERK_USER_EMAIL in apps/web/.env.test.local");
test.describe.configure({ mode: "serial" });

// Plain names, as a user would see them; the test user is dedicated to tests.
const TOP_LEVEL = ["Spanish", "French", "Cell biology"];
let ids: { spanish: string; clozeNote: string };

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  await deleteDecks(page, TOP_LEVEL);
  const deck = (name: string, parentId?: string) =>
    api<{ id: string }>(page, "POST", "/decks", { name, parentId }).then((d) => d.id);
  const { noteTypes } = await api<{ noteTypes: { id: string; name: string }[] }>(page, "GET", "/note-types");
  const type = (name: string) => noteTypes.find((nt) => nt.name === name)!.id;
  const note = (noteType: string, deckId: string, fields: Record<string, string>) =>
    api<{ id: string }>(page, "POST", "/notes", { noteTypeId: type(noteType), deckId, fields });

  const spanish = await deck("Spanish");
  const verbs = await deck("Verbs", spanish);
  const food = await deck("Food", spanish);
  const french = await deck("French");
  const grammar = await deck("Grammar", french);
  await deck("Cell biology");
  for (const [front, back] of [["comer", "to eat"], ["ser vs. estar", "to be (essence vs. state)"], ["vivir", "to live"]]) {
    await note("Basic (and reversed card)", verbs, { "1": front, "2": back });
  }
  for (const [front, back] of [["la berenjena", "the eggplant"], ["el ajo", "garlic"]]) {
    await note("Basic (and reversed card)", food, { "1": front, "2": back });
  }
  await note("Basic", grammar, { "1": "le subjonctif après « bien que »", "2": "Bien qu’il <b>soit</b> tard…" });
  const cloze = await note("Cloze", spanish, {
    "1": "{{c1::Madrid}} is the capital of {{c2::Spain}}.",
    "2": "Capital since <i>1561</i>, apart from 1601 to 1606.",
  });
  ids = { spanish, clozeNote: cloze.id };
  await page.close();
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  await deleteDecks(page, TOP_LEVEL);
  await page.close();
});

for (const theme of THEMES) {
  test(`the four screens in ${theme}`, async ({ page }, testInfo) => {
    await signIn(page);
    const shot = (name: string, path: string, ready?: Parameters<typeof capture>[2]["ready"]) =>
      capture(page, testInfo, { set: "web-screens", name, path, theme, ready });
    await shot("deck-list", "/decks", (p) => p.getByRole("table").waitFor());
    await shot("deck-page", `/decks/${ids.spanish}`, (p) => p.getByRole("heading", { level: 1 }).waitFor());
    await shot("note-editor", `/notes/${ids.clozeNote}/edit`, async (p) => {
      // The preview frames render once the theme is known; then let them load.
      await p.getByRole("complementary", { name: "Preview" }).getByTitle("Card back").waitFor();
      await p.waitForTimeout(500);
    });
    await shot("card-browser", "/cards", (p) => p.getByRole("heading", { level: 1 }).waitFor());
  });
}
