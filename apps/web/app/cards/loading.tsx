import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid max-w-[1100px] gap-3.5" aria-busy="true" aria-label="Loading your cards">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-[38px] w-full" />
      <div className="overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex h-[38px] items-center gap-4 border-b px-3 last:border-b-0">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
