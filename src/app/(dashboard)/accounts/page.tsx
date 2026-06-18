import type { Metadata } from "next";
import { Wallet } from "lucide-react";

import { getAccounts } from "@/actions/accounts";
import { AccountForm } from "@/components/accounts/account-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const accounts = await getAccounts();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>

      {accounts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between rounded-xl border border-border bg-card p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="size-4 text-primary" aria-hidden />
                  <span className="font-medium">{a.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.broker ? `${a.broker} · ` : ""}
                  {formatCurrency(a.starting_balance, a.currency)} start
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="accent">{a.asset_class}</Badge>
                <span className="text-xs text-muted-foreground">{a.platform}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Create one below to start importing trades.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>New account</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
