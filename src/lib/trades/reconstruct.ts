import { Decimal } from "decimal.js";

import type {
  AssetClass,
  Direction,
  ParsedExecution,
  ReconstructedTrade,
} from "@/types/trading";
import { slicePnl } from "./pnl";

interface IndexedExec extends ParsedExecution {
  _i: number;
}

interface OpenState {
  symbol: string;
  assetClass: AssetClass;
  direction: Direction;
  multiplier: Decimal;
  /** Average entry price of the currently open quantity (average-cost basis). */
  avgCost: Decimal;
  /** Signed running position (+ long, − short); never zero while a trade is open. */
  pos: Decimal;
  qtyOpened: Decimal;
  qtyClosed: Decimal;
  /** Accumulators for the volume-weighted average exit price. */
  exitQty: Decimal;
  exitNotional: Decimal;
  realized: Decimal;
  fees: Decimal;
  openedAt: string;
  lastAt: string;
  initialRisk: Decimal | null;
  execIdx: number[];
  execRefs: string[];
}

const ZERO = new Decimal(0);

/**
 * Reconstruct logical trades from a flat list of executions using the
 * **average-cost, walk-to-flat** method. Executions are grouped by symbol and
 * processed in (executedAt, input-order) order. Position flips (crossing zero)
 * split into two trades; a non-flat residual at the end is an open trade.
 *
 * Assumes all executions belong to a single account. `quantity <= 0` rows are
 * ignored defensively (parsers should already drop them).
 */
export function reconstructTrades(
  executions: ParsedExecution[],
): ReconstructedTrade[] {
  const bySymbol = new Map<string, IndexedExec[]>();
  executions.forEach((e, i) => {
    if (!(e.quantity > 0)) return;
    const arr = bySymbol.get(e.symbol) ?? [];
    arr.push({ ...e, _i: i });
    bySymbol.set(e.symbol, arr);
  });

  const trades: ReconstructedTrade[] = [];
  for (const execs of bySymbol.values()) {
    trades.push(...reconstructOneSymbol(execs));
  }
  // Stable order: by open time, then symbol.
  trades.sort(
    (a, b) =>
      Date.parse(a.openedAt) - Date.parse(b.openedAt) ||
      a.symbol.localeCompare(b.symbol),
  );
  return trades;
}

function reconstructOneSymbol(input: IndexedExec[]): ReconstructedTrade[] {
  const execs = [...input].sort((a, b) => {
    const ta = Date.parse(a.executedAt);
    const tb = Date.parse(b.executedAt);
    if (ta !== tb) return ta - tb;
    return a._i - b._i;
  });

  const trades: ReconstructedTrade[] = [];
  let open: OpenState | null = null;

  for (const e of execs) {
    const signedQ =
      e.side === "buy"
        ? new Decimal(e.quantity)
        : new Decimal(e.quantity).neg();

    if (!open) {
      open = startTrade(e, signedQ);
      continue;
    }

    const sameDirection = open.pos.isPositive() === signedQ.isPositive();

    if (sameDirection) {
      // Scale in: volume-weighted average entry.
      const absPos = open.pos.abs();
      const absQ = signedQ.abs();
      open.avgCost = open.avgCost
        .times(absPos)
        .plus(new Decimal(e.price).times(absQ))
        .div(absPos.plus(absQ));
      open.pos = open.pos.plus(signedQ);
      open.qtyOpened = open.qtyOpened.plus(absQ);
      open.fees = open.fees.plus(e.fees);
      pushExec(open, e);
      open.lastAt = e.executedAt;
      continue;
    }

    // Opposite side: reduce / close / flip.
    const absPos = open.pos.abs();
    const absQ = signedQ.abs();
    const closeQty = Decimal.min(absQ, absPos);

    open.realized = open.realized.plus(
      slicePnl(open.direction, open.avgCost, e.price, closeQty, open.multiplier),
    );
    open.exitQty = open.exitQty.plus(closeQty);
    open.exitNotional = open.exitNotional.plus(
      new Decimal(e.price).times(closeQty),
    );
    open.qtyClosed = open.qtyClosed.plus(closeQty);

    const proratedFee = absQ.isZero()
      ? ZERO
      : new Decimal(e.fees).times(closeQty).div(absQ);
    open.fees = open.fees.plus(proratedFee);
    pushExec(open, e);
    open.lastAt = e.executedAt;

    const newPos = open.pos.plus(signedQ);

    if (newPos.isZero()) {
      trades.push(finalizeClosed(open, e.executedAt));
      open = null;
    } else if (newPos.isPositive() === open.pos.isPositive()) {
      // Partial close, still open in the same direction.
      open.pos = newPos;
    } else {
      // Flip: close the current trade flat, open a new opposite trade with the
      // leftover quantity. The flip fill is shared between both trades.
      trades.push(finalizeClosed(open, e.executedAt));
      const leftover = absQ.minus(closeQty);
      const remainingFee = new Decimal(e.fees).minus(proratedFee);
      const newDir: Direction = signedQ.isPositive() ? "long" : "short";
      open = {
        symbol: e.symbol,
        assetClass: e.assetClass ?? "crypto",
        direction: newDir,
        multiplier: new Decimal(e.multiplier ?? 1),
        avgCost: new Decimal(e.price),
        pos: newDir === "long" ? leftover : leftover.neg(),
        qtyOpened: leftover,
        qtyClosed: ZERO,
        exitQty: ZERO,
        exitNotional: ZERO,
        realized: ZERO,
        fees: remainingFee,
        openedAt: e.executedAt,
        lastAt: e.executedAt,
        initialRisk: e.initialRisk != null ? new Decimal(e.initialRisk) : null,
        execIdx: [e._i],
        execRefs: e.ref != null ? [e.ref] : [],
      };
    }
  }

  if (open) trades.push(finalizeOpen(open));
  return trades;
}

function startTrade(e: IndexedExec, signedQ: Decimal): OpenState {
  return {
    symbol: e.symbol,
    assetClass: e.assetClass ?? "crypto",
    direction: signedQ.isPositive() ? "long" : "short",
    multiplier: new Decimal(e.multiplier ?? 1),
    avgCost: new Decimal(e.price),
    pos: signedQ,
    qtyOpened: signedQ.abs(),
    qtyClosed: ZERO,
    exitQty: ZERO,
    exitNotional: ZERO,
    realized: ZERO,
    fees: new Decimal(e.fees),
    openedAt: e.executedAt,
    lastAt: e.executedAt,
    initialRisk: e.initialRisk != null ? new Decimal(e.initialRisk) : null,
    execIdx: [e._i],
    execRefs: e.ref != null ? [e.ref] : [],
  };
}

function pushExec(open: OpenState, e: IndexedExec): void {
  open.execIdx.push(e._i);
  if (e.ref != null) open.execRefs.push(e.ref);
}

function finalizeClosed(open: OpenState, closedAt: string): ReconstructedTrade {
  const gross = open.realized;
  const net = gross.minus(open.fees);
  const avgExit = open.exitQty.isZero()
    ? null
    : open.exitNotional.div(open.exitQty);
  const rMultiple =
    open.initialRisk && !open.initialRisk.isZero()
      ? net.div(open.initialRisk)
      : null;

  return {
    symbol: open.symbol,
    assetClass: open.assetClass,
    direction: open.direction,
    status: "closed",
    openedAt: open.openedAt,
    closedAt,
    qtyOpened: open.qtyOpened.toNumber(),
    qtyClosed: open.qtyClosed.toNumber(),
    avgEntryPrice: open.avgCost.toNumber(),
    avgExitPrice: avgExit ? avgExit.toNumber() : null,
    multiplier: open.multiplier.toNumber(),
    grossPnl: gross.toNumber(),
    fees: open.fees.toNumber(),
    netPnl: net.toNumber(),
    initialRisk: open.initialRisk ? open.initialRisk.toNumber() : null,
    rMultiple: rMultiple ? rMultiple.toNumber() : null,
    executionIndexes: open.execIdx,
    executionRefs: open.execRefs,
  };
}

function finalizeOpen(open: OpenState): ReconstructedTrade {
  return {
    symbol: open.symbol,
    assetClass: open.assetClass,
    direction: open.direction,
    status: "open",
    openedAt: open.openedAt,
    closedAt: null,
    qtyOpened: open.qtyOpened.toNumber(),
    qtyClosed: open.qtyClosed.toNumber(),
    avgEntryPrice: open.avgCost.toNumber(),
    avgExitPrice: null,
    multiplier: open.multiplier.toNumber(),
    grossPnl: null,
    fees: open.fees.toNumber(),
    netPnl: null,
    initialRisk: open.initialRisk ? open.initialRisk.toNumber() : null,
    rMultiple: null,
    executionIndexes: open.execIdx,
    executionRefs: open.execRefs,
  };
}
