import "server-only";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getAccounts } from "@/actions/accounts";
import {
  summarize,
  buildEquityCurve,
  pnlByDay,
  type ClosedTradeMetric,
  type PerformanceSummary,
  type EquityPoint,
  type DayPnl,
} from "@/lib/metrics/metrics";
import type { Tables } from "@/types/database";

export type Trade = Tables<"trades">;
export type Execution = Tables<"executions">;
export type Account = Tables<"accounts">;

export interface TradeFilters {
  symbol?: string;
  direction?: "long" | "short";
  status?: "open" | "closed";
  from?: string;
  to?: string;
}

/** Trades for an account, newest first, with optional filters. */
export async function getTrades(
  accountId: string,
  filters: TradeFilters = {},
): Promise<Trade[]> {
  const supabase = await createClient();
  let q = supabase.from("trades").select("*").eq("account_id", accountId);
  if (filters.symbol) q = q.ilike("symbol", `%${filters.symbol}%`);
  if (filters.direction) q = q.eq("direction", filters.direction);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.from) q = q.gte("opened_at", filters.from);
  if (filters.to) q = q.lte("opened_at", filters.to);
  const { data } = await q.order("opened_at", { ascending: false });
  return data ?? [];
}

export async function getTrade(id: string): Promise<Trade | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/** Executions composing a trade — by linked trade_id, else by time range. */
export async function getTradeExecutions(trade: Trade): Promise<Execution[]> {
  const supabase = await createClient();
  const { data: linked } = await supabase
    .from("executions")
    .select("*")
    .eq("trade_id", trade.id)
    .order("executed_at", { ascending: true });
  if (linked && linked.length > 0) return linked;

  // Fallback for unlinked executions (failed link / cross-batch trade). Only
  // safe for CLOSED trades (bounded window) and restricted to still-unlinked
  // rows, so we never pull another trade's fills of the same symbol.
  if (!trade.closed_at) return [];
  const { data } = await supabase
    .from("executions")
    .select("*")
    .eq("account_id", trade.account_id)
    .eq("symbol", trade.symbol)
    .is("trade_id", null)
    .gte("executed_at", trade.opened_at)
    .lte("executed_at", trade.closed_at)
    .order("executed_at", { ascending: true });
  return data ?? [];
}

export interface DashboardData {
  summary: PerformanceSummary;
  equityCurve: EquityPoint[];
  calendar: DayPnl[];
  recentTrades: Trade[];
  openTrades: number;
  currency: string;
  timezone: string;
}

/** Compute the full performance dashboard for an account over a day range. */
export async function getDashboardData(
  account: Account,
  rangeDays: number | null,
): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, base_currency")
    .maybeSingle();
  const tz = profile?.timezone ?? "UTC";
  const currency = account.currency ?? profile?.base_currency ?? "USD";

  let q = supabase
    .from("trades")
    .select("*")
    .eq("account_id", account.id)
    .eq("status", "closed")
    .not("net_pnl", "is", null);
  if (rangeDays) {
    const from = new Date(Date.now() - rangeDays * 86_400_000).toISOString();
    q = q.gte("closed_at", from);
  }
  const { data: closed } = await q.order("closed_at", { ascending: true });

  const metricInput: ClosedTradeMetric[] = (closed ?? []).map((t) => ({
    netPnl: t.net_pnl as number,
    rMultiple: t.r_multiple,
    closedAt: t.closed_at as string,
    id: t.id,
  }));

  const summary = summarize(metricInput, account.starting_balance);
  const equityCurve = buildEquityCurve(metricInput, account.starting_balance);
  const calendar = pnlByDay(metricInput, tz);

  const { data: recent } = await supabase
    .from("trades")
    .select("*")
    .eq("account_id", account.id)
    .order("opened_at", { ascending: false })
    .limit(8);

  const { count: openTrades } = await supabase
    .from("trades")
    .select("*", { count: "exact", head: true })
    .eq("account_id", account.id)
    .eq("status", "open");

  return {
    summary,
    equityCurve,
    calendar,
    recentTrades: recent ?? [],
    openTrades: openTrades ?? 0,
    currency,
    timezone: tz,
  };
}

/** Resolve the active account from the cookie, defaulting to the first. */
export function resolveActiveAccount(
  accounts: Account[],
  cookieValue: string | undefined,
): Account | null {
  if (accounts.length === 0) return null;
  return accounts.find((a) => a.id === cookieValue) ?? accounts[0];
}

/** The user's accounts plus the currently active one (from the cookie). */
export async function getActiveAccount(): Promise<{
  accounts: Account[];
  active: Account | null;
}> {
  const accounts = await getAccounts();
  const store = await cookies();
  const active = resolveActiveAccount(
    accounts,
    store.get("active_account")?.value,
  );
  return { accounts, active };
}
