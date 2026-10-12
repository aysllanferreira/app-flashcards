import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();

  // Signed-in users start at their decks.
  if (userId) redirect("/decks");

  return (
    <div className="grid max-w-[920px] items-center gap-10 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:py-10">
      <div className="grid gap-5">
        <h1 className="font-heading text-[40px] leading-[1.05] font-medium tracking-tight text-balance md:text-[56px]">
          Remember what you study.
        </h1>
        <p className="max-w-[46ch] text-lg text-muted-foreground">
          Write a note once and get flashcards that come back just before
          you&apos;d forget them. Reversed cards and cloze deletions included.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link href="/sign-up">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
      {/* A cloze card as the study session shows it. */}
      <figure
        aria-label="Example card"
        className="grid gap-3 rounded-xl border bg-card p-5 text-card-foreground"
      >
        <span className="text-xs tracking-wider text-muted-foreground uppercase">
          Spanish · Cloze 1
        </span>
        <p className="py-6 text-center text-xl">
          <span className="font-semibold text-due">[...]</span> is the capital
          of Spain.
        </p>
        <div className="flex justify-between font-mono text-xs text-muted-foreground">
          <span>
            <span className="text-new">12</span> new ·{" "}
            <span className="text-due">30</span> due
          </span>
          <span>Show answer</span>
        </div>
      </figure>
    </div>
  );
}
