import { describe, it, expect } from "vitest";

import {
  netPnL,
  winRate,
  profitFactor,
  averageRMultiple,
  maxDrawdown,
  buildEquityCurve,
  pnlByDay,
  summarize,
  type ClosedTradeMetric,
} from "./metrics";

function t(
  netPnl: number,
  closedAt: string,
  rMultiple: number | null = null,
  id?: string,
): ClosedTradeMetric {
  return { netPnl, closedAt, rMultiple, id };
}

const D = (n: number) => `2026-06-1${n}T15:00:00Z`;

describe("metrics", () => {
  it("sums net PnL (no float drift)", () => {
    expect(netPnL([t(0.1, D(0)), t(0.2, D(1))])).toBeCloseTo(0.3, 12);
    expect(netPnL([])).toBe(0);
  });

  it("computes win rate excluding breakeven trades", () => {
    // 2 wins, 1 loss, 1 breakeven → 2/3
    const trades = [t(10, D(0)), t(5, D(1)), t(-4, D(2)), t(0, D(3))];
    expect(winRate(trades)).toBeCloseTo(2 / 3, 10);
    expect(winRate([])).toBe(0);
  });

  it("computes profit factor with edge cases", () => {
    expect(profitFactor([t(30, D(0)), t(-10, D(1)), t(-5, D(2))])).toBeCloseTo(2, 10); // 30 / 15
    expect(profitFactor([t(30, D(0)), t(10, D(1))])).toBe(Infinity); // no losses
    expect(profitFactor([])).toBeNull(); // no data
    expect(profitFactor([t(0, D(0))])).toBeNull(); // only breakeven
  });

  it("averages R-multiple and reports excluded count", () => {
    const r = averageRMultiple([
      t(100, D(0), 2),
      t(-50, D(1), -1),
      t(20, D(2), null), // excluded
    ]);
    expect(r.avg).toBeCloseTo(0.5, 10); // (2 + -1) / 2
    expect(r.counted).toBe(2);
    expect(r.excluded).toBe(1);
    expect(averageRMultiple([t(5, D(0), null)]).avg).toBeNull();
  });

  it("computes max drawdown (absolute and percent)", () => {
    // start 1000: +200 -> 1200 (peak), -500 -> 700 (dd 500 / 1200), +100 -> 800
    const trades = [t(200, D(0)), t(-500, D(1)), t(100, D(2))];
    const dd = maxDrawdown(trades, 1000);
    expect(dd.absolute).toBe(500);
    expect(dd.percent).toBeCloseTo(500 / 1200, 10);
  });

  it("returns zero drawdown for a monotonic up curve", () => {
    const dd = maxDrawdown([t(100, D(0)), t(50, D(1))], 1000);
    expect(dd.absolute).toBe(0);
    expect(dd.percent).toBe(0);
  });

  it("builds a running equity curve sorted by close time", () => {
    const curve = buildEquityCurve([t(-500, D(1)), t(200, D(0))], 1000);
    expect(curve.map((p) => p.equity)).toEqual([1200, 700]);
  });

  it("buckets PnL by local calendar day in the given timezone", () => {
    // 2026-06-10T03:30:00Z is 2026-06-09 in America/New_York (UTC-4)
    const trades = [
      { netPnl: 10, rMultiple: null, closedAt: "2026-06-10T03:30:00Z" },
      { netPnl: -4, rMultiple: null, closedAt: "2026-06-10T18:00:00Z" },
    ];
    const utc = pnlByDay(trades, "UTC");
    expect(utc).toHaveLength(1);
    expect(utc[0]).toEqual({ day: "2026-06-10", netPnl: 6, tradeCount: 2 });

    const ny = pnlByDay(trades, "America/New_York");
    expect(ny).toHaveLength(2);
    expect(ny[0]).toEqual({ day: "2026-06-09", netPnl: 10, tradeCount: 1 });
    expect(ny[1]).toEqual({ day: "2026-06-10", netPnl: -4, tradeCount: 1 });
  });

  it("summarize bundles the headline metrics", () => {
    const s = summarize([t(100, D(0), 2), t(-50, D(1), -1)], 1000);
    expect(s.netPnl).toBe(50);
    expect(s.winRate).toBe(0.5);
    expect(s.profitFactor).toBeCloseTo(2, 10);
    expect(s.avgRMultiple).toBeCloseTo(0.5, 10);
    expect(s.tradeCount).toBe(2);
  });
});
