import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid max-w-[920px] gap-6" aria-busy="true" aria-label="Loading the deck">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-9 w-56" />
      <div className="flex gap-7 border-y py-3.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-14" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
