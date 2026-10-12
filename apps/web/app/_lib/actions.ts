"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiClient, type ApiSchemas, errorMessage } from "./api";

/** What a form action reports back: nothing on success, or why it failed. */
export type ActionResult = { ok: true } | { ok: false; error: string };

// Every page reads the API on each request; refresh whatever is on screen.
const refresh = () => revalidatePath("/", "layout");

const failed = (error: unknown): ActionResult => ({ ok: false, error: errorMessage(error) });

export async function createDeck(body: ApiSchemas["CreateDeckBody"]): Promise<ActionResult> {
  const { error } = await (await apiClient()).POST("/decks", { body });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

export async function updateDeck(
  id: string,
  body: ApiSchemas["UpdateDeckBody"],
): Promise<ActionResult> {
  const { error } = await (await apiClient()).PATCH("/decks/{id}", {
    params: { path: { id } },
    body,
  });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

/** Deletes the deck and goes back to the deck list. */
export async function deleteDeck(id: string): Promise<ActionResult> {
  const { error } = await (await apiClient()).DELETE("/decks/{id}", {
    params: { path: { id } },
  });
  if (error) return failed(error);
  refresh();
  redirect("/decks");
}

export async function createNote(
  body: ApiSchemas["CreateNoteBody"],
): Promise<ActionResult & { noteId?: string }> {
  const { data, error } = await (await apiClient()).POST("/notes", { body });
  if (error) return failed(error);
  refresh();
  return { ok: true, noteId: data.id };
}

export async function updateNote(
  id: string,
  body: ApiSchemas["UpdateNoteBody"],
): Promise<ActionResult> {
  const { error } = await (await apiClient()).PATCH("/notes/{id}", {
    params: { path: { id } },
    body,
  });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const { error } = await (await apiClient()).DELETE("/notes/{id}", {
    params: { path: { id } },
  });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

/** How many cards deleting a note would delete. */
export async function noteCardCount(id: string): Promise<number | null> {
  const { data } = await (await apiClient()).GET("/notes/{id}", { params: { path: { id } } });
  return data ? data.cards.length : null;
}

export async function moveCard(id: string, deckId: string): Promise<ActionResult> {
  const { error } = await (await apiClient()).PATCH("/cards/{id}", {
    params: { path: { id } },
    body: { deckId },
  });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

export type CardQuery = {
  deckId?: string;
  q?: string;
  sort?: "sortField" | "createdAt" | "dueAt";
  order?: "asc" | "desc";
};

/** The next page of the card browser. */
export async function loadMoreCards(
  query: CardQuery,
  cursor: string,
): Promise<ApiSchemas["CardListResponse"] | null> {
  const { data } = await (await apiClient()).GET("/cards", {
    params: { query: { ...query, cursor, limit: 50 } },
  });
  return data ?? null;
}
