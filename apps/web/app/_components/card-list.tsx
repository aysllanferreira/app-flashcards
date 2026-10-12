import type { ReactNode } from "react";
import { cn } from "cn";
import type { ApiSchemas } from "../_lib/api";
import { cardLabel, type DeckWithDepth, deckPath, displaySortField, formatDue, isDue } from "../_lib/format";

type CardRow = ApiSchemas["CardRow"];

const STATE_STYLE: Record<CardRow["state"], string> = {
  new: "bg-new-muted text-new",
  learning: "bg-learning-muted text-learning",
  review: "bg-secondary text-secondary-foreground",
  relearning: "bg-due-muted text-due",
};

export function StateChip({ state }: { state: CardRow["state"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-full px-2 text-xs font-medium whitespace-nowrap capitalize",
        STATE_STYLE[state],
      )}
    >
      {state}
    </span>
  );
}

/**
 * Cards as a dense table from 768 px and as stacked rows below, with an
 * optional per-row action menu.
 */
export function CardList({
  cards,
  decks,
  label,
  actions,
}: {
  cards: CardRow[];
  decks: DeckWithDepth[];
  label: string;
  actions?: (card: CardRow) => ReactNode;
}) {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const deckName = (card: CardRow) => {
    const deck = byId.get(card.deckId);
    return deck ? deckPath(deck) : card.deckName;
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
      <table className="hidden w-full border-collapse text-[13.5px] md:table" aria-label={label}>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="h-9 px-3 font-medium">Sort field</th>
            <th scope="col" className="h-9 px-3 font-medium">Deck</th>
            <th scope="col" className="h-9 px-3 font-medium">Card</th>
            <th scope="col" className="h-9 px-3 font-medium">State</th>
            <th scope="col" className="h-9 px-3 font-medium">Due</th>
            {actions ? (
              <th scope="col" className="h-9 w-11">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id} className="border-b last:border-b-0 hover:bg-accent/60">
              <td className="h-[38px] max-w-[300px] truncate px-3 font-medium">{displaySortField(card.sortField)}</td>
              <td className="px-3 whitespace-nowrap">{deckName(card)}</td>
              <td className="px-3 whitespace-nowrap">{cardLabel(card)}</td>
              <td className="px-3"><StateChip state={card.state} /></td>
              <td
                className={cn(
                  "px-3 font-mono whitespace-nowrap tabular-nums",
                  card.state === "new" ? "text-muted-foreground" : isDue(card) && "text-due",
                )}
              >
                {formatDue(card)}
              </td>
              {actions ? <td className="pr-1.5 text-right">{actions(card)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="md:hidden" aria-label={label}>
        {cards.map((card) => (
          <li
            key={card.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b px-3.5 py-2.5 last:border-b-0"
          >
            <span className="truncate font-medium">{displaySortField(card.sortField)}</span>
            <span className="col-start-1 truncate text-[12.5px] text-muted-foreground">
              {deckName(card)} · {cardLabel(card)}
            </span>
            <span className="col-start-2 row-span-2 row-start-1 flex items-center gap-1.5">
              <span className="grid justify-items-end gap-0.5">
                <StateChip state={card.state} />
                {card.state !== "new" ? (
                  <span className={cn("font-mono text-xs tabular-nums", isDue(card) ? "text-due" : "text-muted-foreground")}>
                    {formatDue(card, { compact: true })}
                  </span>
                ) : null}
              </span>
              {actions ? actions(card) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
