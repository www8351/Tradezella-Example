import { Suspense } from "react";
import type { Metadata } from "next";

import { getActiveAccount, getTrades, type TradeFilters } from "@/lib/data/trades";
import { TradeTable } from "@/components/trades/trade-table";
import { TradeFilterBar } from "@/components/trades/filter-bar";
import { NoAccountPrompt } from "@/components/dashboard/no-account-prompt";

export const metadata: Metadata = { title: "Trades" };

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; direction?: string; status?: string }>;
}) {
  const { active } = await getActiveAccount();
  if (!active) {
    return <NoAccountPrompt message="Create an account and import trades to see your log." />;
  }

  const sp = await searchParams;
  const filters: TradeFilters = {
    symbol: sp.symbol || undefined,
    direction:
      sp.direction === "long" || sp.direction === "short"
        ? sp.direction
        : undefined,
    status:
      sp.status === "open" || sp.status === "closed" ? sp.status : undefined,
  };
  const trades = await getTrades(active.id, filters);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>
        <span className="text-sm text-muted-foreground">
          {trades.length} trade{trades.length === 1 ? "" : "s"}
        </span>
      </div>
      <Suspense fallback={<div className="h-9" />}>
        <TradeFilterBar />
      </Suspense>
      <TradeTable trades={trades} currency={active.currency} />
    </div>
  );
}
