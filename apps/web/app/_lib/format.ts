import type { ApiSchemas } from "./api";

type Deck = ApiSchemas["Deck"];

/** Decks in tree order with their depth and the path of names above them. */
export function withDepth(decks: Deck[]) {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const ancestors = (deck: Deck): Deck[] => {
    const parent = deck.parentId ? byId.get(deck.parentId) : undefined;
    return parent ? [...ancestors(parent), parent] : [];
  };
  return decks.map((deck) => {
    const above = ancestors(deck);
    return { ...deck, depth: above.length, path: [...above.map((d) => d.name), deck.name] };
  });
}

export type DeckWithDepth = ReturnType<typeof withDepth>[number];

/** "Spanish › Verbs". */
export const deckPath = (deck: DeckWithDepth) => deck.path.join(" › ");

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * When a card is due: nothing for new cards, the time for today, otherwise
 * the date (ISO in the dense table, short on phones).
 */
export function formatDue(
  card: { state: string; dueAt: string },
  { compact = false, now = new Date() }: { compact?: boolean; now?: Date } = {},
): string {
  if (card.state === "new") return "·";
  const due = new Date(card.dueAt);
  const time = `${pad(due.getHours())}:${pad(due.getMinutes())}`;
  if (compact) {
    if (sameDay(due, now)) return time;
    return due.toLocaleDateString("en", { month: "short", day: "numeric" });
  }
  const date = `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
  return sameDay(due, now) ? `${date} ${time}` : date;
}

/** True when a card that isn't new is due now or earlier. */
export const isDue = (card: { state: string; dueAt: string }, now = new Date()) =>
  card.state !== "new" && new Date(card.dueAt) <= now;

/** "Card 2" for standard note types, "Cloze 2" for cloze cards. */
export const cardLabel = (card: { templateName: string; clozeIndex: number }) =>
  card.clozeIndex > 0 ? `Cloze ${card.clozeIndex}` : card.templateName;

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

/** A sort field for display: cloze markers ({{c1::text::hint}}) show their text. */
export const displaySortField = (sortField: string) =>
  sortField.replace(/\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g, "$1") || "(empty)";
