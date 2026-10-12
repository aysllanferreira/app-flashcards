import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeckFormDialog } from "../_components/deck-form-dialog";
import { DeckTree } from "../_components/deck-tree";
import { LoadError } from "../_components/load-error";
import { PageHeader } from "../_components/page-header";
import { apiClient } from "../_lib/api";
import { plural, withDepth } from "../_lib/format";

export const metadata: Metadata = { title: "Decks · Flashcards" };

export default async function DecksPage() {
  const { data } = await (await apiClient()).GET("/decks").catch(() => ({ data: undefined }));
  if (!data) {
    return (
      <div className="max-w-[920px]">
        <PageHeader title="Decks" />
        <LoadError title="Couldn't load your decks" />
      </div>
    );
  }

  const decks = withDepth(data.decks);
  const roots = decks.filter((d) => d.parentId === null);
  const due = roots.reduce((sum, d) => sum + d.subtree.due, 0);
  const newDeck = (label: string, variant: "default" | "outline" = "outline") => (
    <DeckFormDialog
      mode={{ kind: "create" }}
      decks={decks}
      trigger={
        <Button variant={variant}>
          <Plus />
          {label}
        </Button>
      }
    />
  );

  if (decks.length === 0) {
    return (
      <div className="max-w-[920px]">
        <PageHeader title="Decks" />
        <section className="grid justify-items-start gap-2.5 rounded-xl border bg-card p-6 text-card-foreground md:p-9">
          <div aria-hidden="true" className="mb-1.5 flex gap-1.5">
            <span className="h-6 w-[34px] rounded-[5px] border-[1.5px] border-dashed border-input" />
            <span className="h-6 w-[34px] -translate-y-1.5 rotate-[4deg] rounded-[5px] border-[1.5px] border-due bg-due-muted" />
            <span className="h-6 w-[34px] rounded-[5px] border-[1.5px] border-dashed border-input" />
          </div>
          <h2 className="font-heading text-[22px] font-medium">Start your first deck</h2>
          <p className="max-w-[46ch] text-muted-foreground">
            Decks hold your cards. Make one for each subject, then add notes to it; every
            note becomes one or more cards.
          </p>
          {newDeck("New deck", "default")}
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-[920px]">
      <PageHeader
        title="Decks"
        description={
          <>
            <span className="font-mono text-due tabular-nums">{due.toLocaleString("en")}</span>{" "}
            {due === 1 ? "card" : "cards"} due across {plural(roots.length, "deck")}
          </>
        }
        actions={
          <>
            {newDeck("New deck")}
            <Button asChild>
              <Link href="/notes/new">
                <Plus />
                Add note
              </Link>
            </Button>
          </>
        }
      />
      <DeckTree decks={decks} label="Your decks" />
      <p className="mt-2.5 text-xs text-muted-foreground">Counts include subdecks.</p>
    </div>
  );
}
