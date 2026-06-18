"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseImport } from "@/lib/import";
import { dedupeExecutions } from "@/lib/import/dedupe";
import type { ImportPlatform } from "@/types/trading";

export interface ImportSummary {
  ok: boolean;
  error?: string;
  warning?: string;
  insertedExecutions?: number;
  duplicateExecutions?: number;
  insertedTrades?: number;
  skipped?: { row: number; reason: string }[];
}

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const metaSchema = z.object({
  accountId: z.string().uuid("Select a valid account."),
  platform: z.enum(["generic", "binance", "coinbase", "bybit", "mt4", "mt5"]),
});

/**
 * Ingest an uploaded broker/exchange file into executions + trades for the
 * selected account. Executions dedupe on (user, content-hash); a full
 * re-import of the same file inserts nothing.
 */
export async function importExecutions(
  formData: FormData,
): Promise<ImportSummary> {
  const user = await requireUser();

  const meta = metaSchema.safeParse({
    accountId: formData.get("accountId"),
    platform: formData.get("platform"),
  });
  if (!meta.success) {
    return { ok: false, error: meta.error.issues[0]?.message ?? "Invalid input." };
  }
  const { accountId, platform } = meta.data as {
    accountId: string;
    platform: ImportPlatform;
  };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file uploaded." };
  if (file.size === 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File too large (max 8 MB)." };
  }
  const text = await file.text();

  const supabase = await createClient();

  // Confirm the account belongs to the user (RLS also enforces this).
  const { data: account, error: accErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .maybeSingle();
  if (accErr) return { ok: false, error: `Account lookup failed: ${accErr.message}` };
  if (!account) return { ok: false, error: "Account not found." };

  let parsed;
  try {
    parsed = parseImport(text, platform);
  } catch {
    return { ok: false, error: "Could not parse the file. Check the platform/format." };
  }

  if (parsed.executions.length === 0) {
    return {
      ok: false,
      error: "No valid rows found in the file.",
      skipped: parsed.skipped,
    };
  }

  const batchId = randomUUID();

  // Collapse byte-identical fills within this upload to a single execution so
  // the trade-newness gate isn't keyed on a row Postgres silently drops.
  const { unique: uniqueExecs, remap } = dedupeExecutions(parsed.executions);

  const execRows = uniqueExecs.map((e) => ({
    id: randomUUID(),
    user_id: user.id,
    account_id: accountId,
    symbol: e.symbol,
    asset_class: e.assetClass ?? "crypto",
    side: e.side,
    quantity: e.quantity,
    price: e.price,
    multiplier: e.multiplier ?? 1,
    fees: e.fees,
    executed_at: e.executedAt,
    import_batch_id: batchId,
  }));

  // Insert executions first; duplicates (same user + content hash) are ignored.
  const { data: insertedExecs, error: execErr } = await supabase
    .from("executions")
    .upsert(execRows, {
      onConflict: "user_id,dedupe_hash",
      ignoreDuplicates: true,
    })
    .select("id");
  if (execErr) {
    return { ok: false, error: `Saving executions failed: ${execErr.message}` };
  }

  const insertedIds = new Set((insertedExecs ?? []).map((r) => r.id));
  const isNewExec = execRows.map((r) => insertedIds.has(r.id));
  const insertedExecutions = insertedIds.size;
  const duplicateExecutions = parsed.executions.length - insertedExecutions;

  // Nothing new (full re-import) — don't create duplicate trades.
  if (insertedExecutions === 0) {
    return {
      ok: true,
      insertedExecutions: 0,
      duplicateExecutions,
      insertedTrades: 0,
      skipped: parsed.skipped,
    };
  }

  // Only persist trades whose composing executions are ALL newly inserted, so a
  // partial/superset re-import never double-counts an already-imported trade.
  // (A trade straddling a prior batch — e.g. an open position closed by a new
  // fill — is deferred to a future cross-batch reconstruction; its new
  // executions are still stored, just not yet linked to a trade.)
  const newTrades = parsed.trades.filter((t) =>
    t.executionIndexes.every((i) => isNewExec[remap[i]]),
  );

  const tradeRows = newTrades.map((t) => ({
    id: randomUUID(),
    user_id: user.id,
    account_id: accountId,
    symbol: t.symbol,
    asset_class: t.assetClass,
    direction: t.direction,
    status: t.status,
    opened_at: t.openedAt,
    closed_at: t.closedAt,
    qty_opened: t.qtyOpened,
    qty_closed: t.qtyClosed,
    avg_entry_price: t.avgEntryPrice,
    avg_exit_price: t.avgExitPrice,
    multiplier: t.multiplier,
    gross_pnl: t.grossPnl,
    fees: t.fees,
    net_pnl: t.netPnl,
    initial_risk: t.initialRisk,
    r_multiple: t.rMultiple,
  }));

  let linkWarning: string | undefined;
  if (tradeRows.length > 0) {
    const { error: tradeErr } = await supabase.from("trades").insert(tradeRows);
    if (tradeErr) {
      return { ok: false, error: `Saving trades failed: ${tradeErr.message}` };
    }

    // Link each trade's executions back to it (executions.trade_id). De-dup the
    // id list (a duplicated fill collapses to one execution row).
    const linkResults = await Promise.all(
      newTrades.map((t, j) => {
        const execIds = [
          ...new Set(t.executionIndexes.map((i) => execRows[remap[i]].id)),
        ];
        return supabase
          .from("executions")
          .update({ trade_id: tradeRows[j].id })
          .in("id", execIds);
      }),
    );
    if (linkResults.some((r) => r.error)) {
      linkWarning =
        "Some executions could not be linked to their trades. Metrics are unaffected.";
    }
  }

  revalidatePath("/dashboard");
  return {
    ok: true,
    insertedExecutions,
    duplicateExecutions,
    insertedTrades: tradeRows.length,
    skipped: parsed.skipped,
    warning: linkWarning,
  };
}
