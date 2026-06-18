import { format, parseISO } from "date-fns";

/** Format a number as currency (default USD, 2 dp). */
export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Currency with an explicit + on positive values (for PnL display). */
export function formatSignedCurrency(value: number, currency = "USD"): string {
  const sign = value > 0 ? "+" : "";
  return sign + formatCurrency(value, currency);
}

/** Compact number, fixed decimals. */
export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format a 0..1 fraction as a percent string. */
export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Profit factor: ∞ / — handling. */
export function formatProfitFactor(value: number | null): string {
  if (value === null) return "—";
  if (!Number.isFinite(value)) return "∞";
  return formatNumber(value, 2);
}

/** R-multiple with an R suffix, or — when unknown. */
export function formatR(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 2)}R`;
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy HH:mm");
}

/** Tailwind text color class for a signed value. */
export function pnlColor(value: number | null | undefined): string {
  if (value == null || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-emerald-400" : "text-destructive";
}
