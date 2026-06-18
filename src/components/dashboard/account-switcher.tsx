"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

import { setActiveAccount } from "@/actions/preferences";
import type { Tables } from "@/types/database";

export function AccountSwitcher({
  accounts,
  activeId,
}: {
  accounts: Tables<"accounts">[];
  activeId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (accounts.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No account yet</span>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <Wallet className="size-4 text-muted-foreground" aria-hidden />
      <span className="sr-only">Active account</span>
      <select
        value={activeId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          startTransition(async () => {
            await setActiveAccount(id);
            router.refresh();
          });
        }}
        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm font-medium outline-none ring-ring/50 focus-visible:ring-2 disabled:opacity-60"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}
