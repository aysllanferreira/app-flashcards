import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CardBrowser } from "../_components/card-browser";
import { LoadError } from "../_components/load-error";
import { PageHeader } from "../_components/page-header";
import { apiClient } from "../_lib/api";
import { withDepth } from "../_lib/format";

export const metadata: Metadata = { title: "Browse cards · Flashcards" };

const SORTS = ["sortField", "createdAt", "dueAt"] as const;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function CardsPage({ searchParams }: PageProps<"/cards">) {
  const params = await searchParams;
  const sortParam = one(params.sort);
  const query = {
    q: one(params.q)?.trim() || undefined,
    deckId: one(params.deckId) || undefined,
    sort: SORTS.find((s) => s === sortParam) ?? "sortField",
    order: one(params.order) === "desc" ? ("desc" as const) : ("asc" as const),
  };

  const api = await apiClient();
  const [page, decks] = await Promise.all([
    api.GET("/cards", { params: { query: { ...query, limit: 50 } } }),
    api.GET("/decks"),
  ]).catch(() => [undefined, undefined] as const);

  const header = (
    <PageHeader
      title="Browse cards"
      actions={
        <Button asChild>
          <Link href="/notes/new">
            <Plus />
            Add note
          </Link>
        </Button>
      }
    />
  );
  if (!page?.data || !decks?.data) {
    return (
      <div className="max-w-[1100px]">
        {header}
        <LoadError title="Couldn't load your cards" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px]">
      {header}
      <CardBrowser query={query} page={page.data} decks={withDepth(decks.data.decks)} />
    </div>
  );
}
