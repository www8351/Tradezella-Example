/**
 * Contract size (value per 1.0 lot / 1 point) for CFD / forex instruments.
 * Used to convert MetaTrader "lots" into a PnL multiplier. Defaults to 1 for
 * anything unknown (spot/equity/crypto), which callers can override.
 *
 * These cover the common majors + metals; exotic instruments fall back to 1
 * and should be reviewed per-account.
 */
const CONTRACT_SIZE: Record<string, number> = {
  // FX majors/minors — standard lot = 100,000 units of base currency.
  EURUSD: 100_000, GBPUSD: 100_000, USDJPY: 100_000, USDCHF: 100_000,
  AUDUSD: 100_000, NZDUSD: 100_000, USDCAD: 100_000, EURGBP: 100_000,
  EURJPY: 100_000, GBPJPY: 100_000,
  // Metals.
  XAUUSD: 100, // 100 oz per lot
  XAGUSD: 5_000, // 5,000 oz per lot
};

/** Lookup the contract multiplier for a CFD/forex symbol. */
export function contractMultiplier(symbol: string): number {
  const base = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (CONTRACT_SIZE[base] != null) return CONTRACT_SIZE[base];
  // Try the first 6 characters (handles suffixed symbols like EURUSD.r / XAUUSDm).
  const head = base.slice(0, 6);
  if (CONTRACT_SIZE[head] != null) return CONTRACT_SIZE[head];
  return 1;
}

/** A contract specification used to price a fill: PnL = priceΔ × qty × multiplier. */
export interface ContractSpec {
  multiplier: number;
  tickSize: number | null;
  pointValue: number | null;
}

/**
 * Point value ($ per 1.00 price move) and tick size for common futures roots.
 * Covers CME/CBOT/NYMEX/COMEX index, energy, metal, rate, and grain majors plus
 * their micros. Unknown roots fall back to a multiplier of 1.
 */
const FUTURES_SPECS: Record<string, { pointValue: number; tickSize: number }> = {
  // Equity index.
  ES: { pointValue: 50, tickSize: 0.25 },
  MES: { pointValue: 5, tickSize: 0.25 },
  NQ: { pointValue: 20, tickSize: 0.25 },
  MNQ: { pointValue: 2, tickSize: 0.25 },
  YM: { pointValue: 5, tickSize: 1 },
  MYM: { pointValue: 0.5, tickSize: 1 },
  RTY: { pointValue: 50, tickSize: 0.1 },
  M2K: { pointValue: 5, tickSize: 0.1 },
  // Energy.
  CL: { pointValue: 1_000, tickSize: 0.01 },
  MCL: { pointValue: 100, tickSize: 0.01 },
  NG: { pointValue: 10_000, tickSize: 0.001 },
  // Metals.
  GC: { pointValue: 100, tickSize: 0.1 },
  MGC: { pointValue: 10, tickSize: 0.1 },
  SI: { pointValue: 5_000, tickSize: 0.005 },
  HG: { pointValue: 25_000, tickSize: 0.0005 },
  // Rates.
  ZB: { pointValue: 1_000, tickSize: 0.03125 },
  ZN: { pointValue: 1_000, tickSize: 0.015625 },
  ZF: { pointValue: 1_000, tickSize: 0.0078125 },
  // Grains.
  ZC: { pointValue: 50, tickSize: 0.25 },
  ZS: { pointValue: 50, tickSize: 0.25 },
  ZW: { pointValue: 50, tickSize: 0.25 },
  // FX futures.
  "6E": { pointValue: 125_000, tickSize: 0.00005 },
  "6B": { pointValue: 62_500, tickSize: 0.0001 },
  "6J": { pointValue: 12_500_000, tickSize: 0.0000005 },
};

const MONTH_CODE = /^([A-Z0-9]+?)[FGHJKMNQUVXZ]\d{1,2}$/;

/** Strip a trailing month+year code, e.g. ESZ5 -> ES, MNQH26 -> MNQ. */
export function futuresRoot(symbol: string): string {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = MONTH_CODE.exec(s);
  return m ? m[1] : s;
}

/** Resolve the contract spec for a futures symbol (multiplier = point value). */
export function futuresContract(symbol: string): ContractSpec {
  const spec = FUTURES_SPECS[futuresRoot(symbol)];
  if (spec) {
    return {
      multiplier: spec.pointValue,
      tickSize: spec.tickSize,
      pointValue: spec.pointValue,
    };
  }
  return { multiplier: 1, tickSize: null, pointValue: null };
}
