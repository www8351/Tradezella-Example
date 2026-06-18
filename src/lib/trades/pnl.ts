import { Decimal } from "decimal.js";

import type { Direction } from "@/types/trading";

// Headroom above decimal.js's default 20 significant digits, so weighted-average
// cost (a repeating decimal on scale-ins) doesn't leak rounding noise into PnL.
// Decimal.set is global; importing this module configures it everywhere.
Decimal.set({ precision: 40 });

export type Numeric = number | string | Decimal;

/**
 * Realized PnL for a single closing slice, computed in exact decimal
 * arithmetic (never floating point).
 *
 *   slice = d · (exitPrice − avgCost) · qty · multiplier
 *
 * where d = +1 for a long, −1 for a short.
 */
export function slicePnl(
  direction: Direction,
  avgCost: Numeric,
  exitPrice: Numeric,
  qty: Numeric,
  multiplier: Numeric = 1,
): Decimal {
  const d = direction === "long" ? 1 : -1;
  return new Decimal(exitPrice)
    .minus(avgCost)
    .times(d)
    .times(qty)
    .times(multiplier);
}
