"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDeck, updateDeck } from "../_lib/actions";
import { type DeckWithDepth, deckPath } from "../_lib/format";

const TOP_LEVEL = "__top__";

type Mode =
  | { kind: "create"; parentId?: string }
  | { kind: "rename"; deck: DeckWithDepth }
  | { kind: "move"; deck: DeckWithDepth };

/**
 * Creates, renames or moves a deck. A failed save keeps what was typed and
 * shows the API's reason, such as a name a sibling already has.
 */
export function DeckFormDialog({
  mode,
  decks,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  mode: Mode;
  decks: DeckWithDepth[];
  /** The button that opens it; omit when `open` is controlled. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const deck = mode.kind === "create" ? undefined : mode.deck;
  const [name, setName] = useState(deck?.name ?? "");
  const [parent, setParent] = useState(
    (mode.kind === "create" ? mode.parentId : deck?.parentId) ?? TOP_LEVEL,
  );

  // A deck can't move under itself or one of its subdecks.
  const parents = decks.filter((d) => !deck || !isBelow(d, deck, decks));

  // Start from the deck's current values each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setError(null);
      setName(deck?.name ?? "");
      setParent((mode.kind === "create" ? mode.parentId : deck?.parentId) ?? TOP_LEVEL);
    }
  }

  const copy = {
    create: { title: "New deck", action: "Create deck", done: "Deck created" },
    rename: { title: "Rename deck", action: "Rename", done: "Deck renamed" },
    move: { title: "Move deck", action: "Move", done: "Deck moved" },
  }[mode.kind];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parentId = parent === TOP_LEVEL ? null : parent;
    startTransition(async () => {
      const result =
        mode.kind === "create"
          ? await createDeck({ name, parentId })
          : await updateDeck(mode.deck.id, mode.kind === "rename" ? { name } : { parentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success(copy.done);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">{copy.title}</DialogTitle>
            <DialogDescription>
              {mode.kind === "move"
                ? `Choose where “${mode.deck.name}” goes. Its subdecks and cards move with it.`
                : "Decks hold your cards. Put a deck under another to group them."}
            </DialogDescription>
          </DialogHeader>
          {mode.kind !== "move" ? (
            <div className="grid gap-2">
              <Label htmlFor="deck-name">Name</Label>
              <Input
                id="deck-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Spanish"
                autoFocus
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "deck-form-error" : undefined}
              />
            </div>
          ) : null}
          {mode.kind !== "rename" ? (
            <div className="grid gap-2">
              <Label htmlFor="deck-parent">{mode.kind === "move" ? "Move under" : "Inside"}</Label>
              <Select value={parent} onValueChange={setParent}>
                <SelectTrigger id="deck-parent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOP_LEVEL}>No parent (top level)</SelectItem>
                  {parents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {deckPath(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {error ? (
            <p id="deck-form-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {copy.action}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** True when `candidate` is `deck` or one of its subdecks. */
function isBelow(candidate: DeckWithDepth, deck: DeckWithDepth, decks: DeckWithDepth[]) {
  const byId = new Map(decks.map((d) => [d.id, d]));
  for (let at: DeckWithDepth | undefined = candidate; at; at = at.parentId ? byId.get(at.parentId) : undefined) {
    if (at.id === deck.id) return true;
  }
  return false;
}
