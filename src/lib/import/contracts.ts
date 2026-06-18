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
