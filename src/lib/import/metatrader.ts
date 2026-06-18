import { parse as parseHtml } from "node-html-parser";

import type { IngestResult } from "@/types/trading";
import { rowsToIngest } from "./completed";
import { contractMultiplier } from "./contracts";
import { normalizeKey, parseSide, type SourceRow } from "./columns";

/**
 * Parse a MetaTrader 4/5 HTML statement ("Closed Transactions" table) into
 * trades. MT exports repeat the "Time" and "Price" headers (open + close), so
 * we disambiguate them positionally before mapping. Lots are converted to a
 * PnL multiplier via the per-symbol contract size.
 */
export function parseMetaTraderHtml(html: string): IngestResult {
  const root = parseHtml(html);
  const tables = root.querySelectorAll("table");

  for (const table of tables) {
    const matrix = table
      .querySelectorAll("tr")
      .map((tr) =>
        tr.querySelectorAll("td, th").map((c) => c.textContent.trim()),
      );

    const headerIdx = matrix.findIndex(looksLikeHeader);
    if (headerIdx === -1) continue;

    const headers = disambiguate(matrix[headerIdx]);
    const typeCol = headers.findIndex((h) => normalizeKey(h) === "type");

    const rows: SourceRow[] = [];
    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const cells = matrix[i];
      if (cells.length < headers.length) continue; // section break / summary row
      if (typeCol >= 0 && parseSide(cells[typeCol]) == null) continue; // not a trade row
      const obj: Record<string, string> = {};
      headers.forEach((h, c) => {
        obj[h] = cells[c] ?? "";
      });
      rows.push({ data: obj, line: i + 1 }); // 1-based <tr> position in the document
    }

    if (rows.length > 0) {
      return rowsToIngest(rows, headers, {
        assetClass: "cfd",
        multiplierFor: contractMultiplier,
      });
    }
  }

  return {
    executions: [],
    trades: [],
    skipped: [{ row: 0, reason: "no MetaTrader closed-trades table found" }],
  };
}

function looksLikeHeader(cells: string[]): boolean {
  const keys = new Set(cells.map(normalizeKey));
  const hasType = keys.has("type");
  const hasSymbol = keys.has("item") || keys.has("symbol");
  const hasSize = keys.has("size") || keys.has("volume");
  return hasType && hasSymbol && hasSize;
}

/**
 * Rename MetaTrader's duplicated headers so the completed-trade mapper can find
 * open vs close: first "Time" → openTime, second → closeTime; first "Price" →
 * openPrice, second → closePrice. Other headers are preserved.
 */
function disambiguate(raw: string[]): string[] {
  let timeSeen = 0;
  let priceSeen = 0;
  return raw.map((h) => {
    const key = normalizeKey(h);
    if (key === "time") {
      timeSeen += 1;
      return timeSeen === 1 ? "Open Time" : "Close Time";
    }
    if (key === "price") {
      priceSeen += 1;
      return priceSeen === 1 ? "Open Price" : "Close Price";
    }
    return h;
  });
}
