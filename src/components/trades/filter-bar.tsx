"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

export function TradeFilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters =
    !!params.get("symbol") || !!params.get("direction") || !!params.get("status");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setParam("symbol", String(fd.get("symbol") ?? "").trim());
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="symbol"
          defaultValue={params.get("symbol") ?? ""}
          placeholder="Search symbol…"
          className="h-9 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none ring-ring/50 focus-visible:ring-2"
        />
      </form>

      <select
        value={params.get("direction") ?? ""}
        onChange={(e) => setParam("direction", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none ring-ring/50 focus-visible:ring-2"
      >
        <option value="">All sides</option>
        <option value="long">Long</option>
        <option value="short">Short</option>
      </select>

      <select
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none ring-ring/50 focus-visible:ring-2"
      >
        <option value="">All statuses</option>
        <option value="closed">Closed</option>
        <option value="open">Open</option>
      </select>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
          Clear
        </button>
      ) : null}
    </div>
  );
}
