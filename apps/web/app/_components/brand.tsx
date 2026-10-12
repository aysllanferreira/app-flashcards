import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "cn";

/** The app name with its two-card mark (the front card in the due color). */
export function Brand({
  className,
  ...props
}: Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 rounded-md font-heading text-lg leading-none font-medium tracking-tight",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="relative h-4 w-5 shrink-0">
        <span className="absolute top-1 left-0 h-[11px] w-[15px] rounded-[3px] border-[1.5px] border-foreground bg-background" />
        <span className="absolute top-0 left-[5px] h-[11px] w-[15px] rounded-[3px] border-[1.5px] border-due bg-due" />
      </span>
      Flashcards
    </Link>
  );
}
