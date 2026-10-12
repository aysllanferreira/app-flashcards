import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardList } from "../../_components/card-list";
import { DeckActions } from "../../_components/deck-actions";
import { DeckFormDialog } from "../../_components/deck-form-dialog";
import { DeckTree } from "../../_components/deck-tree";
import { LoadError } from "../../_components/load-error";
import { apiClient } from "../../_lib/api";
import { withDepth } from "../../_lib/format";

export const metadata: Metadata = { title: "Deck · Flashcards" };

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  const api = await apiClient();
  const [one, all, cards] = await Promise.all([
    api.GET("/decks/{id}", { params: { path: { id } } }),
    api.GET("/decks"),
    api.GET("/cards", { params: { query: { deckId: id, limit: 20, sort: "dueAt" } } }),
  ]).catch(() => [undefined, undefined, undefined] as const);

  if (one?.response.status === 404 || one?.response.status === 400) notFound();
  if (!one?.data || !all?.data || !cards?.data) {
    return <LoadError title="Couldn't load this deck" />;
  }

  const deck = one.data;
  const decks = withDepth(all.data.decks);
  const current = decks.find((d) => d.id === deck.id)!;
  const ancestors = current.path.slice(0, -1);
  const subdecks = decks.filter((d) => d.parentId === deck.id);
  const below = decks.filter((d) => d.path.length > current.path.length && d.path.slice(0, current.path.length).join("\u0000") === current.path.join("\u0000"));

  return (
    <div className="max-w-[920px]">
      <nav aria-label="Breadcrumb" className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link href="/decks" className="hover:text-foreground hover:underline">Decks</Link>
        {ancestors.map((name, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span>{name}</span>
          </span>
        ))}
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span aria-current="page" className="text-foreground">{deck.name}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3.5">
        <div className="min-w-0">
          <h1 className="font-heading text-[28px] leading-tight font-medium tracking-tight text-balance md:text-[34px]">
            {deck.name}
          </h1>
          {deck.description ? (
            <p className="mt-1.5 max-w-[60ch] text-muted-foreground">{deck.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <DeckActions deck={deck} current={current} decks={decks} />
        </div>
      </div>

      <dl className="mb-7 flex flex-wrap gap-x-7 gap-y-2 border-y py-3.5">
        {[
          ["New", deck.subtree.new, "text-new"],
          ["Due now", deck.subtree.due, "text-due"],
          ["Cards", deck.subtree.total, ""],
        ].map(([label, value, color]) => (
          <div key={label as string} className="grid gap-px">
            <dd className={`font-mono text-2xl leading-tight font-medium tabular-nums ${color}`}>
              {(value as number).toLocaleString("en")}
            </dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="grid gap-7">
        <section aria-labelledby="subdecks-title">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 id="subdecks-title" className="font-heading text-lg font-medium">Subdecks</h2>
            <DeckFormDialog
              mode={{ kind: "create", parentId: deck.id }}
              decks={decks}
              trigger={
                <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground">
                  <Plus />
                  New subdeck
                </Button>
              }
            />
          </div>
          {subdecks.length > 0 ? (
            <DeckTree decks={below} label={`Subdecks of ${deck.name}`} />
          ) : (
            <p className="text-sm text-muted-foreground">No subdecks. Add one to split this deck by topic.</p>
          )}
        </section>

        <section aria-labelledby="cards-title">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 id="cards-title" className="font-heading text-lg font-medium">Cards</h2>
            {cards.data.cards.length > 0 ? (
              <Link href={`/cards?deckId=${deck.id}`} className="text-[13px] text-muted-foreground hover:text-foreground hover:underline">
                Open in browser
              </Link>
            ) : null}
          </div>
          {cards.data.cards.length > 0 ? (
            <CardList cards={cards.data.cards} decks={decks} label={`Cards in ${deck.name}`} />
          ) : (
            <div className="grid justify-items-start gap-2 rounded-xl border bg-card p-5">
              <p className="text-muted-foreground">No cards yet. Add a note and its cards land here.</p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/notes/new?deckId=${deck.id}`}>
                  <Plus />
                  Add note
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
