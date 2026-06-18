import type { Metadata } from "next";

import { getActiveAccount } from "@/lib/data/trades";
import { ImportForm } from "@/components/import/import-form";
import { NoAccountPrompt } from "@/components/dashboard/no-account-prompt";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const { active } = await getActiveAccount();
  if (!active) {
    return <NoAccountPrompt message="Create an account before importing trades." />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import trades</h1>
        <p className="text-sm text-muted-foreground">
          Importing into{" "}
          <span className="font-medium text-foreground">{active.name}</span>.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <ImportForm accountId={active.id} />
        </CardContent>
      </Card>
    </div>
  );
}
