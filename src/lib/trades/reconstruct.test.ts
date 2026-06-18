import { describe, it, expect } from "vitest";

import { reconstructTrades } from "./reconstruct";
import type { ParsedExecution, Side } from "@/types/trading";

function ex(
  side: Side,
  quantity: number,
  price: number,
  executedAt: string,
  extra: Partial<ParsedExecution> = {},
): ParsedExecution {
  return {
    symbol: extra.symbol ?? "BTCUSDT",
    side,
    quantity,
    price,
    fees: extra.fees ?? 0,
    executedAt,
    ...extra,
  };
}

const T = (n: number) => `2026-06-18T10:0${n}:00Z`;

describe("reconstructTrades — average cost, walk to flat", () => {
  it("closes a simple long round trip", () => {
    const trades = reconstructTrades([
      ex("buy", 10, 100, T(0)),
      ex("sell", 10, 110, T(1)),
    ]);
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.status).toBe("closed");
    expect(t.direction).toBe("long");
    expect(t.qtyOpened).toBe(10);
    expect(t.qtyClosed).toBe(10);
    expect(t.avgEntryPrice).toBe(100);
    expect(t.avgExitPrice).toBe(110);
    expect(t.grossPnl).toBe(100);
    expect(t.netPnl).toBe(100);
  });

  it("closes a short round trip with profit when price falls", () => {
    const trades = reconstructTrades([
      ex("sell", 5, 50, T(0)),
      ex("buy", 5, 40, T(1)),
    ]);
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.direction).toBe("short");
    expect(t.status).toBe("closed");
    expect(t.grossPnl).toBe(50); // (50 - 40) * 5
    expect(t.avgEntryPrice).toBe(50);
    expect(t.avgExitPrice).toBe(40);
  });

  it("scales in (weighted avg) then closes fully", () => {
    const trades = reconstructTrades([
      ex("buy", 10, 100, T(0)),
      ex("buy", 10, 120, T(1)),
      ex("sell", 20, 130, T(2)),
    ]);
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.avgEntryPrice).toBe(110); // (10*100 + 10*120)/20
    expect(t.qtyOpened).toBe(20);
    expect(t.grossPnl).toBe(400); // (130 - 110) * 20
  });

  it("leaves a partial scale-out open", () => {
    const trades = reconstructTrades([
      ex("buy", 10, 100, T(0)),
      ex("sell", 4, 110, T(1)),
    ]);
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.status).toBe("open");
    expect(t.qtyOpened).toBe(10);
    expect(t.qtyClosed).toBe(4);
    expect(t.netPnl).toBeNull();
    expect(t.grossPnl).toBeNull();
    expect(t.closedAt).toBeNull();
  });

  it("splits a position flip into a closed trade + a new opposite trade", () => {
    const trades = reconstructTrades([
      ex("buy", 10, 100, T(0)),
      ex("sell", 15, 120, T(1)),
    ]);
    expect(trades).toHaveLength(2);
    const [first, second] = trades.sort((a, b) =>
      a.openedAt.localeCompare(b.openedAt),
    );
    expect(first.status).toBe("closed");
    expect(first.direction).toBe("long");
    expect(first.qtyOpened).toBe(10);
    expect(first.grossPnl).toBe(200); // (120 - 100) * 10

    expect(second.status).toBe("open");
    expect(second.direction).toBe("short");
    expect(second.qtyOpened).toBe(5);
    expect(second.avgEntryPrice).toBe(120);
  });

  it("subtracts fees and computes R-multiple from initial risk", () => {
    const trades = reconstructTrades([
      ex("buy", 10, 100, T(0), { fees: 1, initialRisk: 50 }),
      ex("sell", 10, 110, T(1), { fees: 1 }),
    ]);
    const t = trades[0];
    expect(t.fees).toBe(2);
    expect(t.grossPnl).toBe(100);
    expect(t.netPnl).toBe(98); // 100 - 2
    expect(t.rMultiple).toBeCloseTo(1.96, 10); // 98 / 50
  });

  it("prorates the flip fill's fee across both trades", () => {
    const trades = reconstructTrades([
      ex("buy", 10, 100, T(0), { fees: 0 }),
      ex("sell", 20, 120, T(1), { fees: 4 }), // closes 10, opens short 10
    ]).sort((a, b) => a.openedAt.localeCompare(b.openedAt));
    // closeQty = 10 of 20 → half the fee on the closed trade.
    expect(trades[0].fees).toBe(2);
    expect(trades[0].netPnl).toBe(198); // 200 gross - 2 fee
    expect(trades[1].fees).toBe(2); // remaining half on the new short
  });

  it("sorts out-of-order timestamps before reconstructing", () => {
    const trades = reconstructTrades([
      ex("sell", 10, 110, T(2)),
      ex("buy", 10, 100, T(0)),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].direction).toBe("long");
    expect(trades[0].grossPnl).toBe(100);
  });

  it("applies a contract multiplier (e.g. metals/futures)", () => {
    const trades = reconstructTrades([
      ex("buy", 2, 2000, T(0), { symbol: "XAUUSD", multiplier: 100 }),
      ex("sell", 2, 2010, T(1), { symbol: "XAUUSD", multiplier: 100 }),
    ]);
    const t = trades[0];
    expect(t.multiplier).toBe(100);
    expect(t.grossPnl).toBe(2000); // (2010 - 2000) * 2 * 100
  });

  it("reconstructs each symbol independently", () => {
    const trades = reconstructTrades([
      ex("buy", 1, 100, T(0), { symbol: "AAA" }),
      ex("buy", 1, 200, T(0), { symbol: "BBB" }),
      ex("sell", 1, 110, T(1), { symbol: "AAA" }),
      ex("sell", 1, 190, T(1), { symbol: "BBB" }),
    ]);
    expect(trades).toHaveLength(2);
    const aaa = trades.find((t) => t.symbol === "AAA")!;
    const bbb = trades.find((t) => t.symbol === "BBB")!;
    expect(aaa.grossPnl).toBe(10);
    expect(bbb.grossPnl).toBe(-10);
  });

  it("drops zero / negative quantity rows", () => {
    const trades = reconstructTrades([
      ex("buy", 0, 100, T(0)),
      ex("buy", 10, 100, T(1)),
      ex("sell", 10, 110, T(2)),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].qtyOpened).toBe(10);
  });

  it("handles fractional crypto quantities without float drift", () => {
    const trades = reconstructTrades([
      ex("buy", 0.1, 30000.55, T(0)),
      ex("buy", 0.2, 30000.65, T(1)),
      ex("sell", 0.3, 31000, T(2)),
    ]);
    const t = trades[0];
    expect(t.qtyOpened).toBeCloseTo(0.3, 10);
    // avg entry = (0.1*30000.55 + 0.2*30000.65)/0.3
    expect(t.avgEntryPrice).toBeCloseTo(30000.6166666667, 6);
    expect(t.status).toBe("closed");
  });

  it("computes exact PnL despite a repeating weighted-average cost", () => {
    // avg = (349*766 + 445*120)/794 = 403.9471... ; gross = 794*404 - 320734 = 42 exactly
    const trades = reconstructTrades([
      ex("buy", 349, 766, T(0)),
      ex("buy", 445, 120, T(1)),
      ex("sell", 794, 404, T(2)),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].grossPnl).toBe(42); // not 42.00000000000001
  });
});
