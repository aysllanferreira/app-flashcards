"use client";

import { clozeFields, sanitizeFieldHtml } from "card-templates";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createNote, updateNote } from "../_lib/actions";
import type { ApiSchemas } from "../_lib/api";
import { type DeckWithDepth, deckPath } from "../_lib/format";
import { CardPreview } from "./card-preview";
import { FieldEditor } from "./field-editor";
import { TagsInput } from "./tags-input";

type NoteType = ApiSchemas["NoteType"];

/**
 * Adds a note (note type and deck pickers) or edits one (`note`), with a live
 * preview of the cards it will produce. A failed save keeps everything typed.
 */
export function NoteEditor({
  noteTypes,
  decks,
  initialDeckId,
  note,
}: {
  noteTypes: NoteType[];
  decks: DeckWithDepth[];
  initialDeckId?: string;
  note?: ApiSchemas["NoteWithCards"];
}) {
  const router = useRouter();
  const [noteTypeId, setNoteTypeId] = useState(note?.noteTypeId ?? noteTypes[0].id);
  const [deckId, setDeckId] = useState(initialDeckId ?? decks[0]?.id ?? "");
  const [fields, setFields] = useState<Record<string, string>>(note?.fields ?? {});
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Remounts the editors after "Save and add another" clears them.
  const [round, setRound] = useState(0);

  const noteType = noteTypes.find((nt) => nt.id === noteTypeId)!;
  const clozeNames = useMemo(() => new Set(clozeFields(noteType)), [noteType]);
  const values = Object.values(fields);

  function save(addAnother: boolean) {
    setError(null);
    const clean = Object.fromEntries(
      noteType.fields.map((f) => [String(f.key), sanitizeFieldHtml(fields[String(f.key)] ?? "")]),
    );
    startTransition(async () => {
      if (note) {
        const result = await updateNote(note.id, { fields: clean, tags });
        if (!result.ok) return setError(result.error);
        toast.success("Note saved");
        router.refresh();
        return;
      }
      const result = await createNote({ noteTypeId, deckId, fields: clean, tags });
      if (!result.ok) return setError(result.error);
      toast.success("Note added");
      if (addAnother) {
        setFields({});
        setRound((r) => r + 1);
      } else {
        router.push(`/decks/${deckId}`);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <form
        className="grid gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        {note ? null : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="note-type">Note type</Label>
              <Select value={noteTypeId} onValueChange={setNoteTypeId}>
                <SelectTrigger id="note-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {noteTypes.map((nt) => (
                    <SelectItem key={nt.id} value={nt.id}>
                      {nt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="note-deck">Deck</Label>
              <Select value={deckId} onValueChange={setDeckId}>
                <SelectTrigger id="note-deck" className="w-full">
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
          </div>
        )}

        {noteType.fields.map((field) => {
          const key = String(field.key);
          const id = `field-${field.key}`;
          const cloze = clozeNames.has(field.name);
          return (
            <div key={`${noteType.id}-${key}-${round}`} className="grid gap-1.5">
              <Label htmlFor={id}>{field.name}</Label>
              <FieldEditor
                id={id}
                label={field.name}
                value={fields[key] ?? ""}
                onChange={(html) => setFields((current) => ({ ...current, [key]: html }))}
                cloze={cloze}
                clozeValues={values}
              />
              {cloze ? (
                <p className="text-[12.5px] text-muted-foreground">
                  Select text and press Cloze (Ctrl+Shift+C) to hide it on its own card.
                </p>
              ) : null}
            </div>
          );
        })}

        <div className="grid gap-1.5">
          <Label htmlFor="note-tags">Tags</Label>
          <TagsInput id="note-tags" value={tags} onChange={setTags} />
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-destructive/35 bg-destructive/[0.06] p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          {note ? null : (
            <Button type="button" variant="outline" className="hidden md:inline-flex" disabled={pending} onClick={() => save(true)}>
              Save and add another
            </Button>
          )}
          <Button type="submit" disabled={pending || (!note && !deckId)}>
            Save note
          </Button>
        </div>
      </form>
      <CardPreview noteType={noteType} fields={fields} />
    </div>
  );
}
