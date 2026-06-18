import type {
  AssetClass,
  IngestResult,
  ParsedExecution,
  ReconstructedTrade,
} from "@/types/trading";
import {
  parseCsv,
  pick,
  parseNumber,
  parseSide,
  parseDateToIso,
  type SourceRow,
} from "./columns";
import { slicePnl } from "@/lib/trades/pnl";

const SYMBOL = ["symbol", "item", "instrument", "ticker", "pair", "market", "contract"];
const SIDE = ["side", "type", "direction", "ordertype", "buysell"];
const QTY = ["qty", "quantity", "size", "lots", "volume", "amount", "contracts"];
const ENTRY = ["entry", "entryprice", "openprice", "priceopen", "open", "avgentry", "entryavg"];
const EXIT = ["exit", "exitprice", "closeprice", "priceclose", "close", "avgexit", "exitavg"];
const OPENTIME = ["opentime", "opendate", "entrytime", "entrydate", "time", "datetime", "date", "openedat"];
const CLOSETIME = ["closetime", "closedate", "exittime", "exitdate", "closedat"];
const COMMISSION = ["commission", "fee", "fees", "comm"];
const SWAP = ["swap", "rollover", "financing", "interest"];
const RISK = ["risk", "initialrisk", "stop", "stoploss", "sl"];

export interface CompletedOpts {
  assetClass?: AssetClass;
  contractFor?: (symbol: string) => {
    multiplier: number;
    tickSize?: number | null;
    pointValue?: number | null;
  };
}

/** Parse a completed-trade CSV (one row = one closed trade). */
export function parseCompletedCsv(text: string, opts: CompletedOpts = {}): IngestResult {
  const { rows, headers } = parseCsv(text);
  return rowsToIngest(rows, headers, opts);
}

/**
 * Convert completed-trade rows into trades + their two synthetic executions.
 * Re-used by both the CSV path and the MetaTrader HTML path.
 */
export function rowsToIngest(
  rows: SourceRow[],
  headers: string[],
  opts: CompletedOpts = {},
): IngestResult {
  const executions: ParsedExecution[] = [];
  const trades: ReconstructedTrade[] = [];
  const skipped: { row: number; reason: string }[] = [];

  rows.forEach(({ data: row, line: lineNo }) => {
    const symbol = pick(row, headers, SYMBOL);
    const side = parseSide(pick(row, headers, SIDE));
    const qty = parseNumber(pick(row, headers, QTY));
    const entry = parseNumber(pick(row, headers, ENTRY));
    const exit = parseNumber(pick(row, headers, EXIT));
    const openTime = parseDateToIso(pick(row, headers, OPENTIME));
    const closeTime = parseDateToIso(pick(row, headers, CLOSETIME)) ?? openTime;

    const reason = !symbol
      ? "missing symbol"
      : !side
        ? "unrecognized side/type"
        : qty == null || qty <= 0
          ? "missing/invalid size"
          : entry == null
            ? "missing entry price"
            : exit == null
              ? "missing exit price"
              : !openTime
                ? "missing open time"
                : null;
    if (reason) {
      skipped.push({ row: lineNo, reason });
      return;
    }

    const sym = symbol as string;
    const direction = side === "buy" ? "long" : "short";
    const spec = opts.contractFor
      ? opts.contractFor(sym)
      : { multiplier: 1, tickSize: null, pointValue: null };
    const multiplier = spec.multiplier;
    const assetClass: AssetClass = opts.assetClass ?? "cfd";
    const commission = Math.abs(parseNumber(pick(row, headers, COMMISSION)) ?? 0);
    const swap = Math.abs(parseNumber(pick(row, headers, SWAP)) ?? 0);
    const fees = commission + swap;
    const risk = parseNumber(pick(row, headers, RISK)) ?? undefined;

    const openIdx = executions.length;
    executions.push({
      symbol: sym,
      side: direction === "long" ? "buy" : "sell",
      quantity: qty as number,
      price: entry as number,
      fees: 0,
      executedAt: openTime as string,
      multiplier,
      assetClass,
      initialRisk: risk,
    });
    const closeIdx = executions.length;
    executions.push({
      symbol: sym,
      side: direction === "long" ? "sell" : "buy",
      quantity: qty as number,
      price: exit as number,
      fees,
      executedAt: closeTime as string,
      multiplier,
      assetClass,
    });

    const gross = slicePnl(direction, entry as number, exit as number, qty as number, multiplier);
    const net = gross.minus(fees);
    const rMultiple =
      risk != null && risk !== 0 ? net.div(risk).toNumber() : null;

    trades.push({
      symbol: sym,
      assetClass,
      direction,
      status: "closed",
      openedAt: openTime as string,
      closedAt: closeTime as string,
      qtyOpened: qty as number,
      qtyClosed: qty as number,
      avgEntryPrice: entry as number,
      avgExitPrice: exit as number,
      multiplier,
      grossPnl: gross.toNumber(),
      fees,
      netPnl: net.toNumber(),
      initialRisk: risk ?? null,
      rMultiple,
      tickSize: spec.tickSize ?? null,
      pointValue: spec.pointValue ?? null,
      contractExpiry: null,
      executionIndexes: [openIdx, closeIdx],
      executionRefs: [],
    });
  });

  return { executions, trades, skipped };
}
