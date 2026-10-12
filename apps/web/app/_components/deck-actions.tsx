"use client";

import { ArrowRightLeft, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ApiSchemas } from "../_lib/api";
import type { DeckWithDepth } from "../_lib/format";
import { DeckFormDialog } from "./deck-form-dialog";
import { DeleteDeckDialog } from "./delete-deck-dialog";

/**
 * A deck page's actions: Rename and Move as buttons from 768 px (in the menu
 * below), Add note, and Delete deck in the menu.
 */
export function DeckActions({
  deck,
  current,
  decks,
}: {
  deck: ApiSchemas["DeckDetail"];
  current: DeckWithDepth;
  decks: DeckWithDepth[];
}) {
  const [dialog, setDialog] = useState<"rename" | "move" | "delete" | null>(null);
  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <>
      <Button variant="outline" className="hidden md:inline-flex" onClick={() => setDialog("rename")}>
        <Pencil />
        Rename
      </Button>
      <Button variant="outline" className="hidden md:inline-flex" onClick={() => setDialog("move")}>
        <ArrowRightLeft />
        Move
      </Button>
      <Button asChild>
        <Link href={`/notes/new?deckId=${deck.id}`}>
          <Plus />
          Add note
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="md:hidden" onSelect={() => setDialog("rename")}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="md:hidden" onSelect={() => setDialog("move")}>
            <ArrowRightLeft />
            Move
          </DropdownMenuItem>
          <DropdownMenuSeparator className="md:hidden" />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
            <Trash2 />
            Delete deck
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeckFormDialog
        mode={{ kind: "rename", deck: current }}
        decks={decks}
        open={dialog === "rename"}
        onOpenChange={close}
      />
      <DeckFormDialog
        mode={{ kind: "move", deck: current }}
        decks={decks}
        open={dialog === "move"}
        onOpenChange={close}
      />
      <DeleteDeckDialog deck={deck} open={dialog === "delete"} onOpenChange={close} />
    </>
  );
}
