"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";

import type { EquityPoint } from "@/lib/metrics/metrics";
import { formatCurrency } from "@/lib/format";

interface Point {
  t: string;
  equity: number;
}

function EquityTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: readonly { payload: Point }[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{format(parseISO(p.t), "MMM d, yyyy")}</p>
      <p className="font-medium tabular-nums">{formatCurrency(p.equity, currency)}</p>
    </div>
  );
}

export function EquityCurve({
  data,
  startingBalance,
  currency,
}: {
  data: EquityPoint[];
  startingBalance: number;
  currency: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No closed trades yet — import to see your equity curve.
      </div>
    );
  }

  // Anchor the starting balance one day before the first trade so the baseline
  // is a distinct x-category (a duplicate timestamp collapses Recharts' category
  // axis and draws a vertical jump at the first date).
  const baselineT = subDays(parseISO(data[0].t), 1).toISOString();
  const chartData: Point[] = [
    { t: baselineT, equity: startingBalance },
    ...data.map((d) => ({ t: d.t, equity: d.equity })),
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tickFormatter={(t) => format(parseISO(t), "MMM d")}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            minTickGap={40}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v, currency)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            width={70}
          />
          <Tooltip
            content={(props) => (
              <EquityTooltip
                active={props.active}
                payload={
                  props.payload as readonly { payload: Point }[] | undefined
                }
                currency={currency}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#equityFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
