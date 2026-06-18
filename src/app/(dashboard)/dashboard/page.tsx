import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Upload, Wallet } from "lucide-react";

import { getActiveAccount, getDashboardData } from "@/lib/data/trades";
import { StatCard } from "@/components/dashboard/stat-card";
import { EquityCurve } from "@/components/charts/equity-curve";
import { PnlCalendar } from "@/components/charts/pnl-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatSignedCurrency,
  formatPercent,
  formatProfitFactor,
  formatR,
  formatCurrency,
  formatDate,
  pnlColor,
} from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const RANGES = [
  { k: "30", days: 30, label: "30D" },
  { k: "90", days: 90, label: "90D" },
  { k: "365", days: 365, label: "1Y" },
  { k: "all", days: null, label: "All" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { active } = await getActiveAccount();
  if (!active) return <NoAccount />;

  const rangeKey = (await searchParams).range ?? "all";
  const range = RANGES.find((r) => r.k === rangeKey) ?? RANGES[3];
  const data = await getDashboardData(active, range.days);
  const s = data.summary;
  const cur = data.currency;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{active.name}</h1>
          <p className="text-sm text-muted-foreground">
            {s.tradeCount} closed · {data.openTrades} open
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          {RANGES.map((r) => (
            <Link
              key={r.k}
              href={`/dashboard?range=${r.k}`}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                r.k === range.k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Net P&L"
          value={formatSignedCurrency(s.netPnl, cur)}
          accent={s.netPnl > 0 ? "positive" : s.netPnl < 0 ? "negative" : "neutral"}
        />
        <StatCard label="Win rate" value={formatPercent(s.winRate)} sub={`${s.tradeCount} trades`} />
        <StatCard label="Profit factor" value={formatProfitFactor(s.profitFactor)} />
        <StatCard
          label="Avg R"
          value={formatR(s.avgRMultiple)}
          sub={s.rExcluded > 0 ? `${s.rCounted} with risk` : undefined}
        />
        <StatCard
          label="Max drawdown"
          value={formatCurrency(s.maxDrawdownAbs, cur)}
          sub={s.maxDrawdownPct !== null ? formatPercent(s.maxDrawdownPct) : undefined}
          accent={s.maxDrawdownAbs > 0 ? "negative" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equity curve</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityCurve
            data={data.equityCurve}
            startingBalance={active.starting_balance}
            currency={cur}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <PnlCalendar data={data.calendar} currency={cur} tz={data.timezone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent trades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentTrades.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No trades yet.
              </p>
            ) : (
              data.recentTrades.map((t) => (
                <Link
                  key={t.id}
                  href={`/trades/${t.id}`}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    {t.direction === "long" ? (
                      <ArrowUpRight className="size-4 text-emerald-400" aria-hidden />
                    ) : (
                      <ArrowDownRight className="size-4 text-destructive" aria-hidden />
                    )}
                    <span className="font-medium">{t.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(t.opened_at)}
                    </span>
                  </span>
                  {t.status === "open" ? (
                    <Badge variant="outline">Open</Badge>
                  ) : (
                    <span className={cn("font-medium tabular-nums", pnlColor(t.net_pnl))}>
                      {t.net_pnl !== null ? formatSignedCurrency(t.net_pnl, cur) : "—"}
                    </span>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NoAccount() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <Wallet className="size-10 text-primary" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        Create your first account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add a trading account, then import your executions to see your
        performance.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Wallet className="size-4" aria-hidden />
          New account
        </Link>
        <Link
          href="/import"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Upload className="size-4" aria-hidden />
          Import
        </Link>
      </div>
    </div>
  );
}
