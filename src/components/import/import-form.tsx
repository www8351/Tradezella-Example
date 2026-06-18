"use client";

import { useState, useTransition } from "react";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";

import { importExecutions, type ImportSummary } from "@/actions/import";
import { Button } from "@/components/ui/button";

const PLATFORMS = [
  { value: "generic", label: "Generic CSV (Ticker, Side, Size, Entry, Exit, DateTime)" },
  { value: "binance", label: "Binance (trade history CSV)" },
  { value: "coinbase", label: "Coinbase (fills CSV)" },
  { value: "bybit", label: "Bybit (trade history CSV)" },
  { value: "mt4", label: "MetaTrader 4 (HTML statement or CSV)" },
  { value: "mt5", label: "MetaTrader 5 (HTML statement or CSV)" },
];

export function ImportForm({ accountId }: { accountId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportSummary | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("accountId", accountId);
        startTransition(async () => {
          setResult(await importExecutions(fd));
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <label htmlFor="platform" className="text-sm font-medium">
          Platform / format
        </label>
        <select
          id="platform"
          name="platform"
          defaultValue="generic"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-2"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="file" className="text-sm font-medium">
          File
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".csv,.txt,.htm,.html"
          className="block w-full cursor-pointer rounded-md border border-input bg-background text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium"
        />
        <p className="text-xs text-muted-foreground">CSV or MetaTrader HTML, up to 8 MB.</p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        Import
      </Button>

      {result ? <ResultPanel result={result} /> : null}
    </form>
  );
}

function ResultPanel({ result }: { result: ImportSummary }) {
  if (!result.ok) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{result.error}</span>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-emerald-400">
        <CheckCircle2 className="size-4" aria-hidden />
        Import complete
      </div>
      <ul className="text-muted-foreground">
        <li>{result.insertedExecutions ?? 0} new executions</li>
        <li>{result.insertedTrades ?? 0} trades reconstructed</li>
        {result.duplicateExecutions ? (
          <li>{result.duplicateExecutions} duplicates skipped</li>
        ) : null}
        {result.skipped && result.skipped.length > 0 ? (
          <li>{result.skipped.length} rows skipped (malformed)</li>
        ) : null}
      </ul>
      {result.warning ? (
        <p className="text-amber-400">{result.warning}</p>
      ) : null}
      {result.skipped && result.skipped.length > 0 ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Show skipped rows</summary>
          <ul className="mt-1 space-y-0.5">
            {result.skipped.slice(0, 20).map((s, i) => (
              <li key={i}>
                Row {s.row}: {s.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
