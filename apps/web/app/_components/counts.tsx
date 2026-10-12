import { cn } from "cn";

/** One count in Geist Mono: new in green, due in terracotta, zeros faded. */
export function Count({ value, kind }: { value: number; kind: "new" | "due" | "total" }) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        value === 0
          ? "text-muted-foreground/55"
          : kind === "new"
            ? "text-new"
            : kind === "due"
              ? "text-due"
              : "text-muted-foreground",
      )}
    >
      {value.toLocaleString("en")}
    </span>
  );
}
