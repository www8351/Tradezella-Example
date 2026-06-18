import Link from "next/link";
import { Wallet } from "lucide-react";

export function NoAccountPrompt({
  message = "Create a trading account to get started.",
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
      <Wallet className="size-10 text-primary" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold tracking-tight">No account yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Link
        href="/accounts"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <Wallet className="size-4" aria-hidden />
        New account
      </Link>
    </div>
  );
}
