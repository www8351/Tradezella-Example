import type { AssetClass, ImportPlatform, IngestResult } from "@/types/trading";
import { reconstructTrades } from "@/lib/trades/reconstruct";
import { parseFills } from "./fills";
import { parseCompletedCsv } from "./completed";
import { parseMetaTraderHtml } from "./metatrader";
import { parseCsv, findColumn } from "./columns";
import { contractMultiplier, futuresContract } from "./contracts";

export const PLATFORM_LABELS: Record<ImportPlatform, string> = {
  generic: "Generic CSV",
  binance: "Binance",
  coinbase: "Coinbase",
  bybit: "Bybit",
  mt4: "MetaTrader 4",
  mt5: "MetaTrader 5",
  futures: "Futures",
};

function fillsToIngest(
  text: string,
  opts: {
    assetClass: AssetClass;
    contractFor?: (symbol: string) => { multiplier: number };
  },
): IngestResult {
  const { executions, skipped } = parseFills(text, opts);
  const trades = reconstructTrades(executions);
  return { executions, trades, skipped };
}

const cfdContract = (s: string) => ({
  multiplier: contractMultiplier(s),
  tickSize: null,
  pointValue: null,
});

function isHtml(text: string): boolean {
  return /<\s*(table|html|tr)\b/i.test(text);
}

function looksCompleted(text: string): boolean {
  const { headers } = parseCsv(text);
  const hasEntry = !!findColumn(headers, ["entry", "entryprice", "openprice", "priceopen"]);
  const hasExit = !!findColumn(headers, ["exit", "exitprice", "closeprice", "priceclose"]);
  return hasEntry && hasExit;
}

/**
 * Parse an uploaded file (CSV or MetaTrader HTML) for a given platform into a
 * unified ingestion result (executions + reconstructed/closed trades).
 */
export function parseImport(text: string, platform: ImportPlatform): IngestResult {
  switch (platform) {
    case "binance":
    case "coinbase":
    case "bybit":
      return fillsToIngest(text, { assetClass: "crypto" });

    case "mt4":
    case "mt5":
      return isHtml(text)
        ? parseMetaTraderHtml(text)
        : parseCompletedCsv(text, { assetClass: "cfd", contractFor: cfdContract });

    case "futures":
      return looksCompleted(text)
        ? parseCompletedCsv(text, {
            assetClass: "futures",
            contractFor: futuresContract,
          })
        : fillsToIngest(text, {
            assetClass: "futures",
            contractFor: futuresContract,
          });

    case "generic":
    default:
      if (isHtml(text)) return parseMetaTraderHtml(text);
      return looksCompleted(text)
        ? parseCompletedCsv(text, { assetClass: "equity" })
        : fillsToIngest(text, { assetClass: "equity" });
  }
}
