import Link from "next/link";
import { CandlestickChart, TrendingUp, Calendar, Target } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Equity curve",
    desc: "See realized P&L over time, peak-to-trough drawdown, and your true growth trajectory.",
  },
  {
    icon: Calendar,
    title: "PnL calendar",
    desc: "A daily heatmap of wins and losses to surface behavioral patterns at a glance.",
  },
  {
    icon: Target,
    title: "Edge metrics",
    desc: "Win rate, profit factor, average R-multiple and max drawdown — computed from your fills.",
  },
];

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <CandlestickChart className="size-6 text-primary" aria-hidden />
          <span className="font-mono text-lg font-semibold tracking-tight">
            AcTrade
          </span>
        </div>
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Sign in
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <span className="mb-5 inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Crypto · CFD · Futures
        </span>
        <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          The trading journal that turns your fills into an{" "}
          <span className="text-primary">edge</span>.
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          Import executions from Binance, Coinbase, Bybit, MT4/MT5 and more.
          AcTrade reconstructs every trade and shows you exactly where your
          performance comes from.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Get started
          </Link>
          <a
            href="#features"
            className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
          >
            Learn more
          </a>
        </div>
      </section>

      <section
        id="features"
        className="grid gap-4 pb-20 sm:grid-cols-3"
        aria-label="Features"
      >
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-lg border border-border bg-card p-5 text-left"
          >
            <Icon className="size-5 text-primary" aria-hidden />
            <h2 className="mt-3 text-sm font-semibold text-card-foreground">
              {title}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
