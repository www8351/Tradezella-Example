import type { DayPnl } from "@/lib/metrics/metrics";
import { formatCurrency } from "@/lib/format";

const POSITIVE = ["bg-emerald-500/30", "bg-emerald-500/55", "bg-emerald-500/90"];
const NEGATIVE = ["bg-destructive/30", "bg-destructive/55", "bg-destructive/90"];

/** Today's calendar date (YYYY-MM-DD) in the given timezone. */
function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const DAY_MS = 86_400_000;
const toUtc = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const keyOf = (d: Date) => d.toISOString().slice(0, 10);

/**
 * GitHub-style heatmap of daily P&L. The data buckets are keyed by the user's
 * timezone (see `pnlByDay`), so the grid is built in that same timezone using
 * UTC-anchored dates — keeping cell keys and bucket keys aligned regardless of
 * where the server runs.
 */
export function PnlCalendar({
  data,
  currency,
  tz = "UTC",
  weeks = 18,
}: {
  data: DayPnl[];
  currency: string;
  tz?: string;
  weeks?: number;
}) {
  const byDay = new Map(data.map((d) => [d.day, d]));
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.netPnl)));

  const today = toUtc(todayInTz(tz));
  let start = addDays(today, -(weeks - 1) * 7);
  start = addDays(start, -start.getUTCDay()); // back to Sunday

  const days: Date[] = [];
  for (let d = start; d.getTime() <= today.getTime(); d = addDays(d, 1)) {
    days.push(d);
  }

  const columns: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (const d of days) {
    week.push(d);
    if (d.getUTCDay() === 6) {
      columns.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    columns.push(week);
  }

  function cellClass(d: Date | null): string {
    if (!d) return "bg-transparent";
    const entry = byDay.get(keyOf(d));
    if (!entry || entry.tradeCount === 0) return "bg-muted";
    if (entry.netPnl === 0) return "bg-muted-foreground/30";
    const ratio = Math.abs(entry.netPnl) / maxAbs;
    const level = ratio > 0.66 ? 2 : ratio > 0.33 ? 1 : 0;
    return entry.netPnl > 0 ? POSITIVE[level] : NEGATIVE[level];
  }

  function title(d: Date | null): string {
    if (!d) return "";
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
    const entry = byDay.get(keyOf(d));
    if (!entry || entry.tradeCount === 0) return `${label} — no trades`;
    return `${label}: ${formatCurrency(entry.netPnl, currency)} (${entry.tradeCount} trade${entry.tradeCount === 1 ? "" : "s"})`;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((d, di) => (
              <div
                key={di}
                title={title(d)}
                className={`size-3 rounded-sm ${cellClass(d)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Loss</span>
        <span className="size-3 rounded-sm bg-destructive/90" />
        <span className="size-3 rounded-sm bg-destructive/55" />
        <span className="size-3 rounded-sm bg-muted" />
        <span className="size-3 rounded-sm bg-emerald-500/55" />
        <span className="size-3 rounded-sm bg-emerald-500/90" />
        <span>Profit</span>
      </div>
    </div>
  );
}
