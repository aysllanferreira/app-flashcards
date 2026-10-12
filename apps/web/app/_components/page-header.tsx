import type { ReactNode } from "react";

/** A page's title row: the heading, an optional line under it, and actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3.5">
      <div className="min-w-0">
        <h1 className="font-heading text-[28px] leading-tight font-medium tracking-tight text-balance md:text-[34px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-[60ch] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
