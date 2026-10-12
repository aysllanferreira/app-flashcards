import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-[920px]" aria-busy="true" aria-label="Loading your decks">
      <h1 className="mb-6 font-heading text-[28px] leading-tight font-medium tracking-tight md:text-[34px]">
        Decks
      </h1>
      <div className="overflow-hidden rounded-xl border bg-card">
        {[46, 34, 40, 28].map((width, i) => (
          <div key={i} className="flex h-[50px] items-center gap-4 border-b px-4 last:border-b-0">
            <Skeleton className="h-3" style={{ width: `${width}%` }} />
            <Skeleton className="ml-auto h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
