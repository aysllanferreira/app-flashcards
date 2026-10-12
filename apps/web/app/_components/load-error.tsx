"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/** Shown in place of a page's data when the API can't be reached. */
export function LoadError({ title, description }: { title: string; description?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="alert"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-xl border border-destructive/35 bg-destructive/[0.06] p-4"
    >
      <CircleAlert className="mt-0.5 size-[18px] text-destructive" aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      <p className="col-start-2 text-muted-foreground">
        {description ?? "The server didn't answer. Your cards are safe; check your connection and try again."}
      </p>
      <div className="col-start-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw className={pending ? "animate-spin" : undefined} />
          Try again
        </Button>
      </div>
    </div>
  );
}
