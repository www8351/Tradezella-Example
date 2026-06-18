import { describe, it, expect } from "vitest";

import { dedupeExecutions } from "./dedupe";
import type { ParsedExecution } from "@/types/trading";

function e(over: Partial<ParsedExecution> = {}): ParsedExecution {
  return {
    symbol: "BTCUSDT",
    side: "buy",
    quantity: 1,
    price: 100,
    fees: 0,
    executedAt: "2026-06-18T10:00:00.000Z",
    ...over,
  };
}

describe("dedupeExecutions", () => {
  it("keeps distinct fills and maps identity", () => {
    const execs = [e({ price: 100 }), e({ price: 110, side: "sell" })];
    const { unique, remap } = dedupeExecutions(execs);
    expect(unique).toHaveLength(2);
    expect(remap).toEqual([0, 1]);
  });

  it("collapses byte-identical fills to one, remapping both copies", () => {
    const execs = [e({ price: 100 }), e({ price: 100 }), e({ price: 110 })];
    const { unique, remap } = dedupeExecutions(execs);
    expect(unique).toHaveLength(2); // the two identical rows collapse
    expect(remap).toEqual([0, 0, 1]); // both copies point to index 0
  });

  it("does not collapse fills that differ in multiplier or asset class", () => {
    const execs = [
      e({ multiplier: 1 }),
      e({ multiplier: 100 }),
      e({ assetClass: "cfd" }),
    ];
    const { unique } = dedupeExecutions(execs);
    expect(unique).toHaveLength(3);
  });
});
