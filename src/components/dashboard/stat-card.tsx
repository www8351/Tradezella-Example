import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  accent = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          accent === "positive" && "text-emerald-400",
          accent === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
