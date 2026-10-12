"use client";

import { Trash2 } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ApiSchemas } from "../_lib/api";
import { deleteDeck } from "../_lib/actions";

/** Asks before deleting a deck, stating what goes with it. */
export function DeleteDeckDialog({
  deck,
  trigger,
  open,
  onOpenChange,
}: {
  deck: ApiSchemas["DeckDetail"];
  /** The button that opens it; omit when `open` is controlled. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { subdecks, cards, notes } = deck.deleteImpact;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setError(null);
        onOpenChange?.(next);
      }}
    >
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl font-medium">
            Delete “{deck.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the deck with everything in it. Review history stays in your
            statistics. You can&apos;t undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="grid grid-cols-3 divide-x rounded-lg border">
          {[
            [subdecks, subdecks === 1 ? "subdeck" : "subdecks"],
            [cards, cards === 1 ? "card" : "cards"],
            [notes, notes === 1 ? "note" : "notes"],
          ].map(([value, label]) => (
            <div key={label} className="grid gap-0.5 px-3 py-2.5">
              <dd className="font-mono text-xl font-medium tabular-nums">
                {value.toLocaleString("en")}
              </dd>
              <dt className="text-xs text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
                // On success the action redirects to the deck list.
                const result = await deleteDeck(deck.id);
                if (result && !result.ok) setError(result.error);
              });
            }}
          >
            <Trash2 />
            Delete deck
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
