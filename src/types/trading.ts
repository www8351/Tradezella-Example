/** Shared trading-domain types used by the ingestion + analytics pipeline. */

export type AssetClass = "crypto" | "cfd" | "futures" | "equity";
export type Side = "buy" | "sell";
export type Direction = "long" | "short";
export type TradeStatus = "open" | "closed";

/** Supported import sources (broker/exchange formats). */
export type ImportPlatform =
  | "generic"
  | "binance"
  | "coinbase"
  | "bybit"
  | "mt4"
  | "mt5"
  | "futures";

/**
 * Normalized execution (a single fill) emitted by every parser adapter and
 * consumed by the trade-reconstruction engine. `quantity` is always positive;
 * direction is carried in `side`.
 */
export interface ParsedExecution {
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
  fees: number;
  /** ISO 8601 timestamp. */
  executedAt: string;
  /** Contract size / point value. Defaults to 1 (spot/equity). */
  multiplier?: number;
  assetClass?: AssetClass;
  /** Optional per-trade initial risk (stop distance × size), when the source provides it. */
  initialRisk?: number;
  /** Opaque caller reference (e.g. a DB row id) carried through reconstruction. */
  ref?: string;
}

/** A logical trade reconstructed from one or more executions. */
export interface ReconstructedTrade {
  symbol: string;
  assetClass: AssetClass;
  direction: Direction;
  status: TradeStatus;
  openedAt: string;
  closedAt: string | null;
  qtyOpened: number;
  qtyClosed: number;
  avgEntryPrice: number;
  avgExitPrice: number | null;
  multiplier: number;
  /** Realized gross PnL (null while the trade is still open). */
  grossPnl: number | null;
  fees: number;
  /** grossPnl − fees (null while open). */
  netPnl: number | null;
  initialRisk: number | null;
  /** netPnl / initialRisk (null when risk is unknown or the trade is open). */
  rMultiple: number | null;
  /** Futures contract metadata (set by the futures path; undefined otherwise). */
  tickSize?: number | null;
  pointValue?: number | null;
  contractExpiry?: string | null;
  /** Indexes into the input execution array that compose this trade. */
  executionIndexes: number[];
  /** Caller refs (e.g. DB ids) of the executions composing this trade. */
  executionRefs: string[];
}

/** Outcome of parsing an uploaded file into normalized executions. */
export interface ParseResult {
  executions: ParsedExecution[];
  /** Rows that were skipped, with a human-readable reason. */
  skipped: { row: number; reason: string }[];
}

/**
 * Unified ingestion output. `trades[i].executionIndexes` point into
 * `executions[]`, so the import action can insert executions, then trades,
 * then link them. Fill sources (crypto) reconstruct trades from executions;
 * completed-trade sources (MT4/MT5, generic entry+exit rows) produce one trade
 * per row directly (re-netting would wrongly merge concurrent positions).
 */
export interface IngestResult {
  executions: ParsedExecution[];
  trades: ReconstructedTrade[];
  skipped: { row: number; reason: string }[];
}
