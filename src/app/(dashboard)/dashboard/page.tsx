import type { Metadata } from "next";
import { CandlestickChart, LogOut } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { signOut } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  // Proves the RLS-backed query path works end-to-end: a user can only read
  // their own profile row (auth.uid() = id).
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, base_currency, timezone")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-border py-5">
        <div className="flex items-center gap-2">
          <CandlestickChart className="size-6 text-primary" aria-hidden />
          <span className="font-mono text-lg font-semibold tracking-tight">
            AcTrade
          </span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </header>

      <section className="py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in as{" "}
          <span className="font-medium text-foreground">{user.email}</span>.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <InfoCard label="Account" value={user.email ?? "—"} />
          <InfoCard label="Base currency" value={profile?.base_currency ?? "USD"} />
          <InfoCard label="Timezone" value={profile?.timezone ?? "UTC"} />
        </div>

        <p className="mt-10 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Phase 2 complete — authentication and the database are live. The
          performance dashboard, trade import, and analytics arrive in the next
          phases.
        </p>
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-card-foreground">
        {value}
      </p>
    </div>
  );
}
