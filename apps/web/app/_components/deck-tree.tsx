"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { DeckWithDepth } from "../_lib/format";
import { Count } from "./counts";

/**
 * Decks as a table in tree order, with counts that include subdecks. A deck
 * with subdecks can be collapsed.
 */
export function DeckTree({ decks, label }: { decks: DeckWithDepth[]; label: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const hasChildren = new Set(decks.map((d) => d.parentId).filter(Boolean));
  const minDepth = Math.min(...decks.map((d) => d.depth));
  const hidden = (deck: DeckWithDepth) => {
    let parent = deck.parentId;
    const byId = new Map(decks.map((d) => [d.id, d]));
    while (parent) {
      if (collapsed.has(parent)) return true;
      parent = byId.get(parent)?.parentId ?? null;
    }
    return false;
  };
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
      <table className="w-full table-fixed border-collapse" aria-label={label}>
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th scope="col" className="h-9 px-3 text-left font-normal md:px-[18px]">Deck</th>
            <th scope="col" className="h-9 w-10 text-right font-normal md:w-16">New</th>
            <th scope="col" className="h-9 w-10 text-right font-normal md:w-16">Due</th>
            <th scope="col" className="h-9 w-12 pr-3 text-right font-normal md:w-20 md:pr-[18px]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {decks.filter((deck) => !hidden(deck)).map((deck) => {
            const depth = deck.depth - minDepth;
            const open = !collapsed.has(deck.id);
            return (
              <tr key={deck.id} className="border-b last:border-b-0 hover:bg-accent/60">
                <td className="h-[46px] px-3 md:h-[50px] md:px-[18px]">
                  <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: depth * 22 }}>
                    {hasChildren.has(deck.id) ? (
                      <button
                        type="button"
                        onClick={() => toggle(deck.id)}
                        aria-expanded={open}
                        aria-label={`${open ? "Collapse" : "Expand"} ${deck.name}`}
                        className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
                      >
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}
                    <Link
                      href={`/decks/${deck.id}`}
                      className={`truncate rounded-sm hover:underline ${depth === 0 ? "font-medium" : ""}`}
                    >
                      {deck.name}
                    </Link>
                  </div>
                </td>
                <td className="text-right"><Count value={deck.subtree.new} kind="new" /></td>
                <td className="text-right"><Count value={deck.subtree.due} kind="due" /></td>
                <td className="pr-3 text-right md:pr-[18px]"><Count value={deck.subtree.total} kind="total" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
