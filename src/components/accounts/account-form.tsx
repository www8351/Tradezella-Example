"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { createAccount } from "@/actions/accounts";
import { Button } from "@/components/ui/button";

const PLATFORMS = [
  "generic",
  "binance",
  "coinbase",
  "bybit",
  "mt4",
  "mt5",
  "futures",
  "equity_broker",
];
const ASSET_CLASSES = ["crypto", "cfd", "futures", "equity"];

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-2";

export function AccountForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          setError(null);
          const r = await createAccount(fd);
          if (r.ok) {
            formRef.current?.reset();
            router.refresh();
          } else {
            setError(r.error ?? "Failed to create account.");
          }
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Name">
        <input name="name" required placeholder="Main account" className={inputCls} />
      </Field>
      <Field label="Broker (optional)">
        <input name="broker" placeholder="e.g. Binance, IC Markets" className={inputCls} />
      </Field>
      <Field label="Platform">
        <select name="platform" defaultValue="generic" className={inputCls}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Asset class">
        <select name="assetClass" defaultValue="crypto" className={inputCls}>
          {ASSET_CLASSES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Currency">
        <input name="currency" defaultValue="USD" maxLength={3} className={inputCls} />
      </Field>
      <Field label="Starting balance">
        <input
          name="startingBalance"
          type="number"
          step="any"
          min="0"
          defaultValue="0"
          className={inputCls}
        />
      </Field>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          Create account
        </Button>
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
