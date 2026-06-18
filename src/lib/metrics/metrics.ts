import { Decimal } from "decimal.js";

// Match the trades pipeline's precision (default is 20 significant digits).
Decimal.set({ precision: 40 });

/** Minimal shape required to compute portfolio metrics — closed trades only. */
export interface ClosedTradeMetric {
  netPnl: number;
  rMultiple: number | null;
  /** ISO 8601 close timestamp. */
  closedAt: string;
  id?: string;
}

/** Net realized PnL across all (closed) trades. */
export function netPnL(trades: ClosedTradeMetric[]): number {
  return trades
    .reduce((sum, t) => sum.plus(t.netPnl), new Decimal(0))
    .toNumber();
}

/**
 * Win rate in [0, 1]. Breakeven trades (netPnl === 0) are excluded from the
 * denominator. Returns 0 when there are no decided trades.
 */
export function winRate(trades: ClosedTradeMetric[]): number {
  const decided = trades.filter((t) => t.netPnl !== 0);
  if (decided.length === 0) return 0;
  const wins = decided.filter((t) => t.netPnl > 0).length;
  return wins / decided.length;
}

/**
 * Profit factor = gross profit / gross loss.
 * - `null` when there is no decided trade (no data).
 * - `Infinity` when there are only winners (gross loss = 0).
 */
export function profitFactor(trades: ClosedTradeMetric[]): number | null {
  let grossProfit = new Decimal(0);
  let grossLoss = new Decimal(0);
  for (const t of trades) {
    if (t.netPnl > 0) grossProfit = grossProfit.plus(t.netPnl);
    else if (t.netPnl < 0) grossLoss = grossLoss.plus(Math.abs(t.netPnl));
  }
  if (grossLoss.isZero()) {
    return grossProfit.isZero() ? null : Infinity;
  }
  return grossProfit.div(grossLoss).toNumber();
}

/**
 * Average R-multiple. Trades without a known initial risk (rMultiple === null)
 * are excluded; the counts are returned for honest UI display.
 */
export function averageRMultiple(trades: ClosedTradeMetric[]): {
  avg: number | null;
  counted: number;
  excluded: number;
} {
  const considered = trades.filter((t) => t.rMultiple != null);
  const excluded = trades.length - considered.length;
  if (considered.length === 0) return { avg: null, counted: 0, excluded };
  const sum = considered.reduce(
    (acc, t) => acc.plus(t.rMultiple as number),
    new Decimal(0),
  );
  return { avg: sum.div(considered.length).toNumber(), counted: considered.length, excluded };
}

/** A point on the realized-equity curve. */
export interface EquityPoint {
  t: string;
  equity: number;
  tradeId?: string;
}

function sortByClose(trades: ClosedTradeMetric[]): ClosedTradeMetric[] {
  return [...trades].sort(
    (a, b) => Date.parse(a.closedAt) - Date.parse(b.closedAt),
  );
}

/**
 * Running realized equity after each closed trade, starting from
 * `startingBalance`. Drives the equity chart and feeds {@link maxDrawdown}.
 */
export function buildEquityCurve(
  trades: ClosedTradeMetric[],
  startingBalance: number,
): EquityPoint[] {
  let running = new Decimal(startingBalance);
  return sortByClose(trades).map((t) => {
    running = running.plus(t.netPnl);
    return { t: t.closedAt, equity: running.toNumber(), tradeId: t.id };
  });
}

/**
 * Max drawdown from the running-equity peak.
 * - `absolute`: largest peak-to-trough drop in account currency.
 * - `percent`: same as a fraction of the peak; `null` when the peak is never positive.
 */
export function maxDrawdown(
  trades: ClosedTradeMetric[],
  startingBalance: number,
): { absolute: number; percent: number | null } {
  // Build the running-equity series (starting balance + each trade's netPnl).
  const equities: Decimal[] = [new Decimal(startingBalance)];
  let running = equities[0];
  for (const t of sortByClose(trades)) {
    running = running.plus(t.netPnl);
    equities.push(running);
  }

  let peak = equities[0];
  let maxAbs = new Decimal(0);
  let maxPct: Decimal | null = null;
  for (const equity of equities) {
    if (equity.gt(peak)) peak = equity;
    const dd = peak.minus(equity);
    if (dd.gt(maxAbs)) maxAbs = dd;
    if (peak.gt(0)) {
      const pct = dd.div(peak);
      if (maxPct === null || pct.gt(maxPct)) maxPct = pct;
    }
  }

  return {
    absolute: maxAbs.toNumber(),
    percent: maxPct === null ? null : maxPct.toNumber(),
  };
}

/** A calendar-heatmap bucket: realized PnL and trade count for one local day. */
export interface DayPnl {
  day: string; // YYYY-MM-DD in the given timezone
  netPnl: number;
  tradeCount: number;
}

function localDay(iso: string, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * Group closed trades into per-day PnL buckets, keyed by the **local calendar
 * day** in `timeZone` (a trade closed at 23:30 ET belongs to the ET day, not UTC).
 */
export function pnlByDay(
  trades: ClosedTradeMetric[],
  timeZone = "UTC",
): DayPnl[] {
  const buckets = new Map<string, { net: Decimal; count: number }>();
  for (const t of trades) {
    const day = localDay(t.closedAt, timeZone);
    const b = buckets.get(day) ?? { net: new Decimal(0), count: 0 };
    b.net = b.net.plus(t.netPnl);
    b.count += 1;
    buckets.set(day, b);
  }
  return [...buckets.entries()]
    .map(([day, b]) => ({ day, netPnl: b.net.toNumber(), tradeCount: b.count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Convenience: every headline metric in one pass-friendly object. */
export interface PerformanceSummary {
  netPnl: number;
  winRate: number;
  profitFactor: number | null;
  avgRMultiple: number | null;
  rCounted: number;
  rExcluded: number;
  maxDrawdownAbs: number;
  maxDrawdownPct: number | null;
  tradeCount: number;
}

export function summarize(
  trades: ClosedTradeMetric[],
  startingBalance: number,
): PerformanceSummary {
  const r = averageRMultiple(trades);
  const dd = maxDrawdown(trades, startingBalance);
  return {
    netPnl: netPnL(trades),
    winRate: winRate(trades),
    profitFactor: profitFactor(trades),
    avgRMultiple: r.avg,
    rCounted: r.counted,
    rExcluded: r.excluded,
    maxDrawdownAbs: dd.absolute,
    maxDrawdownPct: dd.percent,
    tradeCount: trades.length,
  };
}
