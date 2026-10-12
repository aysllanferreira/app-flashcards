import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoadError } from "../../../_components/load-error";
import { NoteEditor } from "../../../_components/note-editor";
import { PageHeader } from "../../../_components/page-header";
import { apiClient } from "../../../_lib/api";
import { plural, withDepth } from "../../../_lib/format";

export const metadata: Metadata = { title: "Edit note · Flashcards" };

export default async function EditNotePage({ params }: PageProps<"/notes/[id]/edit">) {
  const { id } = await params;
  const api = await apiClient();
  const [note, types, decks] = await Promise.all([
    api.GET("/notes/{id}", { params: { path: { id } } }),
    api.GET("/note-types"),
    api.GET("/decks"),
  ]).catch(() => [undefined, undefined, undefined] as const);

  if (note?.response.status === 404 || note?.response.status === 400) notFound();
  if (!note?.data || !types?.data || !decks?.data) {
    return (
      <div className="max-w-[1100px]">
        <PageHeader title="Edit note" />
        <LoadError title="Couldn't load this note" />
      </div>
    );
  }

  const noteType = types.data.noteTypes.find((nt) => nt.id === note.data.noteTypeId);
  return (
    <div className="max-w-[1100px]">
      <PageHeader
        title="Edit note"
        description={`${noteType?.name ?? "Note"} · ${plural(note.data.cards.length, "card")}`}
      />
      <NoteEditor noteTypes={types.data.noteTypes} decks={withDepth(decks.data.decks)} note={note.data} />
    </div>
  );
}
