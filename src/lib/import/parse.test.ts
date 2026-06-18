import { describe, it, expect } from "vitest";

import { parseImport } from "./index";

describe("parseImport — generic CSV", () => {
  it("parses per-fill rows and reconstructs a trade", () => {
    const csv = [
      "Symbol,Side,Quantity,Price,Time,Fee",
      "BTCUSDT,buy,1,100,2026-06-18T10:00:00Z,0.5",
      "BTCUSDT,sell,1,110,2026-06-18T10:05:00Z,0.5",
    ].join("\n");

    const { executions, trades, skipped } = parseImport(csv, "generic");
    expect(executions).toHaveLength(2);
    expect(skipped).toHaveLength(0);
    expect(trades).toHaveLength(1);
    expect(trades[0].grossPnl).toBe(10);
    expect(trades[0].fees).toBe(1);
    expect(trades[0].netPnl).toBe(9);
  });

  it("treats completed-trade rows (entry+exit) as one trade each, without re-netting", () => {
    const csv = [
      "Ticker,Side,Size,Entry,Exit,DateTime",
      "AAPL,long,10,150,155,2026-06-18T10:00:00Z",
      "AAPL,long,5,160,158,2026-06-18T10:01:00Z",
    ].join("\n");

    const { trades } = parseImport(csv, "generic");
    expect(trades).toHaveLength(2); // NOT merged into one netted position
    const byEntry = trades.sort((a, b) => a.avgEntryPrice - b.avgEntryPrice);
    expect(byEntry[0].grossPnl).toBe(50); // (155-150)*10
    expect(byEntry[1].grossPnl).toBe(-10); // (158-160)*5
  });
});

describe("parseImport — crypto exchange fills", () => {
  it("maps Binance-style headers (Pair / Executed / Date(UTC))", () => {
    const csv = [
      "Date(UTC),Pair,Side,Executed,Price,Fee",
      "2026-06-18 10:00:00,ETHUSDT,BUY,2,2000,1",
      "2026-06-18 10:05:00,ETHUSDT,SELL,2,2100,1",
    ].join("\n");

    const { trades, executions } = parseImport(csv, "binance");
    expect(executions).toHaveLength(2);
    expect(executions[0].assetClass).toBe("crypto");
    expect(trades).toHaveLength(1);
    expect(trades[0].grossPnl).toBe(200);
    expect(trades[0].netPnl).toBe(198);
  });
});

describe("parseImport — MetaTrader", () => {
  it("parses an MT5 HTML statement with contract sizing", () => {
    const html = `<html><body><table>
      <tr><th>Time</th><th>Type</th><th>Volume</th><th>Symbol</th><th>Price</th><th>S/L</th><th>T/P</th><th>Time</th><th>Price</th><th>Commission</th><th>Swap</th><th>Profit</th></tr>
      <tr><td>2026.06.18 10:00:00</td><td>buy</td><td>1.00</td><td>XAUUSD</td><td>2000.00</td><td>0</td><td>0</td><td>2026.06.18 12:00:00</td><td>2010.00</td><td>-5</td><td>-2</td><td>1000.00</td></tr>
    </table></body></html>`;

    const { trades } = parseImport(html, "mt5");
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.direction).toBe("long");
    expect(t.multiplier).toBe(100); // XAUUSD contract size
    expect(t.grossPnl).toBe(1000); // (2010-2000)*1*100
    expect(t.fees).toBe(7); // |commission| + |swap|
    expect(t.netPnl).toBe(993);
    expect(t.assetClass).toBe("cfd");
  });

  it("parses an MT completed-trade CSV (short, forex multiplier)", () => {
    const csv = [
      "Symbol,Type,Size,Open Price,Close Price,Open Time,Close Time,Commission,Swap",
      "EURUSD,sell,2,1.1000,1.0950,2026.06.18 10:00:00,2026.06.18 11:00:00,4,1",
    ].join("\n");

    const { trades } = parseImport(csv, "mt5");
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.direction).toBe("short");
    expect(t.multiplier).toBe(100_000);
    expect(t.grossPnl).toBeCloseTo(1000, 6); // (1.1000-1.0950)*2*100000
    expect(t.fees).toBe(5);
    expect(t.netPnl).toBeCloseTo(995, 6);
  });
});

describe("parseImport — error handling", () => {
  it("skips malformed rows with a reason and keeps the good ones", () => {
    const csv = [
      "Symbol,Side,Quantity,Price,Time",
      "BTCUSDT,buy,1,100,2026-06-18T10:00:00Z",
      "BTCUSDT,sell,,,2026-06-18T10:05:00Z", // missing qty + price
      ",sell,1,110,2026-06-18T10:06:00Z", // missing symbol
    ].join("\n");

    const { executions, skipped } = parseImport(csv, "generic");
    expect(executions).toHaveLength(1);
    expect(skipped.length).toBe(2);
    expect(skipped[0].row).toBe(3);
  });

  it("reports the true physical line for a row skipped after a blank line", () => {
    const csv = [
      "Symbol,Side,Quantity,Price,Time", // line 1
      "BTCUSDT,buy,1,100,2026-06-18T10:00:00Z", // line 2
      "", // line 3 (blank)
      ",sell,1,110,2026-06-18T10:06:00Z", // line 4 — missing symbol
    ].join("\n");
    const { skipped } = parseImport(csv, "generic");
    expect(skipped).toHaveLength(1);
    expect(skipped[0].row).toBe(4);
  });
});

describe("parseImport — timestamp normalization", () => {
  it("orders Z-suffixed and naked timestamps consistently as UTC", () => {
    // Without UTC normalization, the naked sell could sort before the buy on a
    // non-UTC server and flip the trade to a short.
    const csv = [
      "Symbol,Side,Quantity,Price,Time",
      "BTCUSDT,buy,1,100,2026-06-18T10:00:00Z",
      "BTCUSDT,sell,1,110,2026.06.18 10:30:00",
    ].join("\n");
    const { trades } = parseImport(csv, "generic");
    expect(trades).toHaveLength(1);
    expect(trades[0].direction).toBe("long");
    expect(trades[0].grossPnl).toBe(10);
  });
});
