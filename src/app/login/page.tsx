import Link from "next/link";
import type { Metadata } from "next";
import { CandlestickChart } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <CandlestickChart className="size-6 text-primary" aria-hidden />
        <span className="font-mono text-lg font-semibold tracking-tight">
          AcTrade
        </span>
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your trading journal.
        </p>
        <div className="mt-6">
          <LoginForm initialError={error} />
        </div>
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        By continuing you agree to keep your trading data private to your account.
      </p>
    </main>
  );
}
