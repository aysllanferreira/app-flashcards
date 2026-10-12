import type { Metadata } from "next";
import { PageHeader } from "../_components/page-header";

export const metadata: Metadata = { title: "Decks · Flashcards" };

// Placeholder until the deck list lands (#65).
export default function DecksPage() {
  return (
    <PageHeader
      title="Decks"
      description="Your decks will be listed here, with the cards that are new and due in each."
    />
  );
}
