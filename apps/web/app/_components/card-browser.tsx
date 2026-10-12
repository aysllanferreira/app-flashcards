"use client";

import { ArrowRightLeft, Ellipsis, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CardQuery,
  deleteNote,
  loadMoreCards,
  moveCard,
  noteCardCount,
} from "../_lib/actions";
import type { ApiSchemas } from "../_lib/api";
import { cardLabel, type DeckWithDepth, deckPath, displaySortField } from "../_lib/format";
import { CardList } from "./card-list";

type CardRow = ApiSchemas["CardRow"];

const ALL_DECKS = "__all__";
const SORTS = {
  "sortField:asc": "Sort field, A to Z",
  "sortField:desc": "Sort field, Z to A",
  "dueAt:asc": "Due soonest",
  "dueAt:desc": "Due latest",
  "createdAt:desc": "Newest first",
  "createdAt:asc": "Oldest first",
} as const;

/** The card browser: search, deck filter, sort, Load more and row actions. */
export function CardBrowser({
  query,
  page,
  decks,
}: {
  query: Required<Pick<CardQuery, "sort" | "order">> & CardQuery;
  page: ApiSchemas["CardListResponse"];
  decks: DeckWithDepth[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [extra, setExtra] = useState<{ cards: CardRow[]; nextCursor: string | null }>({ cards: [], nextCursor: page.nextCursor });
  const [loading, startLoading] = useTransition();
  const [moving, setMoving] = useState<CardRow | null>(null);
  const [deleting, setDeleting] = useState<{ card: CardRow; count: number | null } | null>(null);
  const cards = [...page.cards, ...extra.cards];

  // New results replace whatever "Load more" added.
  const [shownPage, setShownPage] = useState(page);
  if (shownPage !== page) {
    setShownPage(page);
    setExtra({ cards: [], nextCursor: page.nextCursor });
  }

  const go = (next: Partial<CardQuery>) => {
    const merged = { ...query, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.deckId) params.set("deckId", merged.deckId);
    if (`${merged.sort}:${merged.order}` !== "sortField:asc") {
      params.set("sort", merged.sort);
      params.set("order", merged.order);
    }
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  };

  return (
    <>
      <form
        role="search"
        className="mb-3.5 grid gap-2 md:grid-cols-[minmax(0,1fr)_200px_200px]"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          go({ q: typeof q === "string" && q.trim() ? q.trim() : undefined });
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input name="q" type="search" defaultValue={query.q ?? ""} placeholder="Search cards" aria-label="Search cards" className="h-[38px] pl-9" />
        </div>
        <Select value={query.deckId ?? ALL_DECKS} onValueChange={(v) => go({ deckId: v === ALL_DECKS ? undefined : v })}>
          <SelectTrigger aria-label="Deck" className="h-[38px] w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DECKS}>All decks</SelectItem>
            {decks.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {deckPath(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={`${query.sort}:${query.order}`}
          onValueChange={(v) => {
            const [sort, order] = v.split(":") as [CardQuery["sort"], CardQuery["order"]];
            go({ sort, order });
          }}
        >
          <SelectTrigger aria-label="Sort" className="h-[38px] w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>

      {cards.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-muted-foreground">
          {query.q || query.deckId ? "No cards match. Try another search or deck." : "No cards yet. Add a note to make some."}
        </div>
      ) : (
        <>
          <p className="mb-2 text-[13px] text-muted-foreground" aria-live="polite">
            Showing <span className="font-mono tabular-nums">{cards.length.toLocaleString("en")}</span>
            {extra.nextCursor ? "" : cards.length === 1 ? " card" : " cards"}
            {extra.nextCursor ? " so far" : ""}
          </p>
          <CardList
            cards={cards}
            decks={decks}
            label="Cards"
            actions={(card) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${displaySortField(card.sortField)}, ${cardLabel(card)}`}>
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/notes/${card.noteId}/edit`}>
                      <Pencil />
                      Edit note
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setMoving(card)}>
                    <ArrowRightLeft />
                    Move to deck
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={async () => {
                      setDeleting({ card, count: null });
                      setDeleting({ card, count: await noteCardCount(card.noteId) });
                    }}
                  >
                    <Trash2 />
                    Delete note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
          {extra.nextCursor ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() =>
                  startLoading(async () => {
                    const next = await loadMoreCards(query, extra.nextCursor!);
                    if (!next) return void toast.error("Couldn't load more cards. Try again.");
                    setExtra((current) => ({ cards: [...current.cards, ...next.cards], nextCursor: next.nextCursor }));
                  })
                }
              >
                {loading ? "Loading…" : "Load 50 more"}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <MoveDialog card={moving} decks={decks} onClose={() => setMoving(null)} />
      <DeleteNoteDialog target={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function MoveDialog({ card, decks, onClose }: { card: CardRow | null; decks: DeckWithDepth[]; onClose: () => void }) {
  const router = useRouter();
  const [deckId, setDeckId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState<CardRow | null>(null);
  if (card !== shown) {
    setShown(card);
    setDeckId(card?.deckId ?? "");
    setError(null);
  }

  return (
    <Dialog open={card !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!card) return;
            startTransition(async () => {
              const result = await moveCard(card.id, deckId);
              if (!result.ok) return setError(result.error);
              toast.success("Card moved");
              onClose();
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">Move card</DialogTitle>
            <DialogDescription>
              “{card ? displaySortField(card.sortField) : ""}” keeps its review history; only its deck changes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="move-deck">Deck</Label>
            <Select value={deckId} onValueChange={setDeckId}>
              <SelectTrigger id="move-deck" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {deckPath(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || deckId === card?.deckId}>
              Move
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteNoteDialog({ target, onClose }: { target: { card: CardRow; count: number | null } | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const count = target?.count;

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl font-medium">Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            “{target ? displaySortField(target.card.sortField) : ""}”{" "}
            {count == null
              ? "and its cards will be deleted."
              : `and its ${count === 1 ? "card" : `${count} cards`} will be deleted.`}{" "}
            Review history stays in your statistics. You can&apos;t undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || count == null}
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              if (!target) return;
              startTransition(async () => {
                const result = await deleteNote(target.card.noteId);
                if (!result.ok) return void toast.error(result.error);
                toast.success("Note deleted");
                onClose();
                router.refresh();
              });
            }}
          >
            <Trash2 />
            Delete note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
