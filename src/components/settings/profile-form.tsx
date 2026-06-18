"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";

const COMMON_TZ = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Jerusalem",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-2";

export function ProfileForm({
  displayName,
  timezone,
  baseCurrency,
}: {
  displayName: string;
  timezone: string;
  baseCurrency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          setError(null);
          setSaved(false);
          const r = await updateProfile(fd);
          if (r.ok) {
            setSaved(true);
            router.refresh();
          } else {
            setError(r.error ?? "Failed to save.");
          }
        });
      }}
      className="grid max-w-md gap-4"
    >
      <label className="space-y-1.5">
        <span className="text-sm font-medium">Display name</span>
        <input name="displayName" defaultValue={displayName} className={inputCls} />
      </label>

      <label className="space-y-1.5">
        <span className="text-sm font-medium">Timezone</span>
        <input
          name="timezone"
          defaultValue={timezone}
          list="tz-list"
          required
          className={inputCls}
        />
        <datalist id="tz-list">
          {COMMON_TZ.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
        <span className="text-xs text-muted-foreground">
          Used to bucket your daily P&L calendar.
        </span>
      </label>

      <label className="space-y-1.5">
        <span className="text-sm font-medium">Base currency</span>
        <input
          name="baseCurrency"
          defaultValue={baseCurrency}
          maxLength={3}
          required
          className={inputCls}
        />
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <Check className="size-3" aria-hidden />
            Saved
          </span>
        ) : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </form>
  );
}
