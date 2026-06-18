import type { AssetClass, ParseResult, ParsedExecution } from "@/types/trading";
import { parseCsv, pick, parseNumber, parseSide, parseDateToIso } from "./columns";

const SYMBOL = [
  "symbol", "pair", "market", "ticker", "instrument", "item", "contract",
  "contracts", "asset", "product", "currencypair",
];
const SIDE = ["side", "type", "direction", "ordertype", "bs", "buysell", "tradetype"];
const QTY = [
  "qty", "quantity", "amount", "size", "executed", "executedqty", "filledqty",
  "filled", "volume", "lots", "quantitytransacted", "baseamount", "execqty",
];
const PRICE = [
  "price", "executionprice", "orderprice", "fillprice", "avgprice",
  "averageprice", "spotprice", "priceatexecution", "tradeprice", "execprice",
];
const TIME = [
  "time", "date", "datetime", "timestamp", "dateutc", "createtime", "executedat",
  "tradetime", "createdtime", "filltime", "transactiontime",
];
const FEES = ["fee", "fees", "commission", "execfee", "feeamount", "feepaid", "tradingfee"];

/**
 * Parse a fill/execution-history CSV (one row = one fill). Used for crypto
 * exchanges and any generic per-fill export. Tolerant to header naming.
 */
export function parseFills(
  text: string,
  opts: {
    assetClass?: AssetClass;
    defaultMultiplier?: number;
    contractFor?: (symbol: string) => { multiplier: number };
  } = {},
): ParseResult {
  const { rows, headers } = parseCsv(text);
  const executions: ParsedExecution[] = [];
  const skipped: { row: number; reason: string }[] = [];

  rows.forEach(({ data: row, line: lineNo }) => {
    const symbol = pick(row, headers, SYMBOL);
    const side = parseSide(pick(row, headers, SIDE));
    const quantity = parseNumber(pick(row, headers, QTY));
    const price = parseNumber(pick(row, headers, PRICE));
    const executedAt = parseDateToIso(pick(row, headers, TIME));
    const fees = parseNumber(pick(row, headers, FEES)) ?? 0;

    const reason = !symbol
      ? "missing symbol"
      : !side
        ? "unrecognized side"
        : quantity == null
          ? "missing/invalid quantity"
          : price == null
            ? "missing/invalid price"
            : !executedAt
              ? "missing/invalid time"
              : quantity <= 0
                ? "non-positive quantity"
                : null;
    if (reason) {
      skipped.push({ row: lineNo, reason });
      return;
    }

    const sym = symbol as string;
    const multiplier = opts.contractFor
      ? opts.contractFor(sym).multiplier
      : (opts.defaultMultiplier ?? 1);
    executions.push({
      symbol: sym,
      side: side as "buy" | "sell",
      quantity: quantity as number,
      price: price as number,
      fees: Math.abs(fees),
      executedAt: executedAt as string,
      multiplier,
      assetClass: opts.assetClass ?? "crypto",
    });
  });

  return { executions, skipped };
}
