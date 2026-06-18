"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { updateTradeNotes } from "@/actions/trades";
import { Button } from "@/components/ui/button";

export function NotesEditor({
  tradeId,
  initialNotes,
}: {
  tradeId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        rows={6}
        placeholder="What was the setup? What did you do well or poorly?"
        className="w-full resize-y rounded-md border border-input bg-background p-3 text-sm outline-none ring-ring/50 focus-visible:ring-2"
      />
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const r = await updateTradeNotes(tradeId, notes);
              if (r.ok) setSaved(true);
              else setError(r.error ?? "Failed to save.");
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save notes
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <Check className="size-3" aria-hidden />
            Saved
          </span>
        ) : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  );
}
