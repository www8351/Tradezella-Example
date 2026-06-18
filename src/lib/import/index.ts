import type { ImportPlatform, IngestResult } from "@/types/trading";
import { reconstructTrades } from "@/lib/trades/reconstruct";
import { parseFills } from "./fills";
import { parseCompletedCsv } from "./completed";
import { parseMetaTraderHtml } from "./metatrader";
import { parseCsv, findColumn } from "./columns";
import { contractMultiplier } from "./contracts";
import type { AssetClass } from "@/types/trading";

export const PLATFORM_LABELS: Record<ImportPlatform, string> = {
  generic: "Generic CSV",
  binance: "Binance",
  coinbase: "Coinbase",
  bybit: "Bybit",
  mt4: "MetaTrader 4",
  mt5: "MetaTrader 5",
};

function fillsToIngest(text: string, assetClass: AssetClass): IngestResult {
  const { executions, skipped } = parseFills(text, { assetClass });
  const trades = reconstructTrades(executions);
  return { executions, trades, skipped };
}

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
      return fillsToIngest(text, "crypto");

    case "mt4":
    case "mt5":
      return isHtml(text)
        ? parseMetaTraderHtml(text)
        : parseCompletedCsv(text, { assetClass: "cfd", multiplierFor: contractMultiplier });

    case "generic":
    default:
      if (isHtml(text)) return parseMetaTraderHtml(text);
      return looksCompleted(text)
        ? parseCompletedCsv(text, { assetClass: "equity" })
        : fillsToIngest(text, "equity");
  }
}
