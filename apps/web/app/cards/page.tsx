import type { Metadata } from "next";
import { PageHeader } from "../_components/page-header";

export const metadata: Metadata = { title: "Browse cards · Flashcards" };

// Placeholder until the card browser lands (#65).
export default function CardsPage() {
  return (
    <PageHeader
      title="Browse cards"
      description="Every card you own will be searchable here, across all your decks."
    />
  );
}
