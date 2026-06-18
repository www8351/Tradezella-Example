import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowDownRight, ArrowUpRight } from "lucide-react";

import { getTrade, getTradeExecutions } from "@/lib/data/trades";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotesEditor } from "@/components/trades/notes-editor";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatSignedCurrency,
  formatNumber,
  formatR,
  formatDateTime,
  pnlColor,
} from "@/lib/format";

export const metadata: Metadata = { title: "Trade" };

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await getTrade(id);
  if (!trade) notFound();

  const executions = await getTradeExecutions(trade);

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("currency, name")
    .eq("id", trade.account_id)
    .maybeSingle();
  const cur = account?.currency ?? "USD";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        href="/trades"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to trades
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {trade.direction === "long" ? (
            <ArrowUpRight className="size-6 text-emerald-400" aria-hidden />
          ) : (
            <ArrowDownRight className="size-6 text-destructive" aria-hidden />
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {trade.symbol}
            </h1>
            <p className="text-sm text-muted-foreground">
              {account?.name} · {trade.asset_class}
            </p>
          </div>
          <Badge variant={trade.direction === "long" ? "success" : "danger"}>
            {trade.direction}
          </Badge>
          {trade.status === "open" ? <Badge variant="outline">Open</Badge> : null}
        </div>
        {trade.status === "closed" && trade.net_pnl !== null ? (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Net P&L
            </p>
            <p className={cn("text-2xl font-semibold tabular-nums", pnlColor(trade.net_pnl))}>
              {formatSignedCurrency(trade.net_pnl, cur)}
            </p>
          </div>
        ) : null}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-4">
          <Field label="Avg entry" value={formatCurrency(trade.avg_entry_price, cur)} />
          <Field
            label="Avg exit"
            value={trade.avg_exit_price !== null ? formatCurrency(trade.avg_exit_price, cur) : "—"}
          />
          <Field label="Qty" value={formatNumber(trade.qty_opened, 2)} />
          <Field label="Multiplier" value={`×${formatNumber(trade.multiplier, 0)}`} />
          <Field
            label="Gross P&L"
            value={trade.gross_pnl !== null ? formatSignedCurrency(trade.gross_pnl, cur) : "—"}
            valueClass={pnlColor(trade.gross_pnl)}
          />
          <Field label="Fees" value={formatCurrency(trade.fees, cur)} />
          <Field label="R-multiple" value={formatR(trade.r_multiple)} valueClass={pnlColor(trade.r_multiple)} />
          <Field
            label="Initial risk"
            value={trade.initial_risk !== null ? formatCurrency(trade.initial_risk, cur) : "—"}
          />
          <Field label="Opened" value={formatDateTime(trade.opened_at)} />
          <Field
            label="Closed"
            value={trade.closed_at ? formatDateTime(trade.closed_at) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executions ({executions.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {executions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              No execution rows linked to this trade.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-muted-foreground">
                    <th className="px-5 py-2 font-medium">Side</th>
                    <th className="px-5 py-2 font-medium">Qty</th>
                    <th className="px-5 py-2 font-medium">Price</th>
                    <th className="px-5 py-2 font-medium">Fees</th>
                    <th className="px-5 py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-2">
                        <Badge variant={e.side === "buy" ? "success" : "danger"}>
                          {e.side}
                        </Badge>
                      </td>
                      <td className="px-5 py-2 tabular-nums">{formatNumber(e.quantity, 2)}</td>
                      <td className="px-5 py-2 tabular-nums">{formatCurrency(e.price, cur)}</td>
                      <td className="px-5 py-2 tabular-nums">{formatCurrency(e.fees, cur)}</td>
                      <td className="px-5 py-2 text-muted-foreground">{formatDateTime(e.executed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal notes</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesEditor tradeId={trade.id} initialNotes={trade.notes ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 font-medium tabular-nums", valueClass)}>{value}</p>
    </div>
  );
}
