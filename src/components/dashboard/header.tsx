"use client";

import { LogOut } from "lucide-react";

import { signOut } from "@/actions/auth";
import { AccountSwitcher } from "./account-switcher";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

export function DashboardHeader({
  accounts,
  activeId,
  userEmail,
}: {
  accounts: Tables<"accounts">[];
  activeId: string | null;
  userEmail: string;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <AccountSwitcher accounts={accounts} activeId={activeId} />
      <div className="flex items-center gap-3">
        <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline">
          {userEmail}
        </span>
        <form action={signOut}>
          <Button variant="secondary" size="sm" type="submit">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
