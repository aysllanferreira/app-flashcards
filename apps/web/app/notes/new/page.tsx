import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadError } from "../../_components/load-error";
import { NoteEditor } from "../../_components/note-editor";
import { PageHeader } from "../../_components/page-header";
import { apiClient } from "../../_lib/api";
import { withDepth } from "../../_lib/format";

export const metadata: Metadata = { title: "Add note · Flashcards" };

export default async function NewNotePage({ searchParams }: PageProps<"/notes/new">) {
  const { deckId } = await searchParams;
  const api = await apiClient();
  const [types, decks] = await Promise.all([api.GET("/note-types"), api.GET("/decks")]).catch(
    () => [undefined, undefined] as const,
  );

  if (!types?.data || !decks?.data) {
    return (
      <div className="max-w-[1100px]">
        <PageHeader title="Add note" />
        <LoadError title="Couldn't load your decks and note types" />
      </div>
    );
  }

  const tree = withDepth(decks.data.decks);
  if (tree.length === 0) {
    return (
      <div className="max-w-[1100px]">
        <PageHeader title="Add note" />
        <div className="grid justify-items-start gap-2.5 rounded-xl border bg-card p-6">
          <p className="text-muted-foreground">Notes go in a deck. Create your first deck, then add notes to it.</p>
          <Button asChild>
            <Link href="/decks">Go to your decks</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initialDeckId = tree.some((d) => d.id === deckId) ? (deckId as string) : undefined;
  return (
    <div className="max-w-[1100px]">
      <PageHeader title="Add note" />
      <NoteEditor noteTypes={types.data.noteTypes} decks={tree} initialDeckId={initialDeckId} />
    </div>
  );
}
