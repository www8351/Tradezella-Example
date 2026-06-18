import type { ParsedExecution } from "@/types/trading";

/**
 * Collapse byte-identical fills to a single representative execution.
 *
 * Postgres `ON CONFLICT (user_id, dedupe_hash) DO NOTHING` keeps only one of two
 * rows that share a content hash, so a duplicated row in an upload must map to a
 * single logical execution — otherwise trade-newness (which gates trade inserts)
 * is keyed on a row that was silently dropped, losing the trade.
 *
 * Returns the unique executions and a `remap` array where `remap[i]` is the
 * index in `unique` for original execution `i`.
 */
export function dedupeExecutions(executions: ParsedExecution[]): {
  unique: ParsedExecution[];
  remap: number[];
} {
  const contentKey = (e: ParsedExecution) =>
    `${e.symbol}|${e.side}|${e.quantity}|${e.price}|${e.executedAt}|${e.multiplier ?? 1}|${e.assetClass ?? "crypto"}`;

  const index = new Map<string, number>();
  const unique: ParsedExecution[] = [];
  const remap = executions.map((e) => {
    const key = contentKey(e);
    let idx = index.get(key);
    if (idx === undefined) {
      idx = unique.length;
      unique.push(e);
      index.set(key, idx);
    }
    return idx;
  });

  return { unique, remap };
}
