# AcTrade — Trading Journal

## What this is
A production-grade, TradeZella-style **trading journal** SaaS. Traders import their
broker/exchange execution history; AcTrade reconstructs each trade, computes performance
analytics (equity curve, PnL calendar, win rate, profit factor, average R-multiple, max
drawdown), and presents them in a dark, data-dense dashboard.

## Who it's for
Active retail traders across **crypto** (Binance, Coinbase, Bybit), **CFD** (MT4/MT5), and
**futures** who want objective, fill-level feedback on their edge — built single-developer
(www8351@gmail.com).

## Why it matters
Most traders never measure their own behavior. By turning raw executions into honest,
per-trade metrics, AcTrade makes the source of P&L visible and improvable.

## Tech stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js **16** (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS **v4**, Framer Motion |
| UI | shadcn / 21st.dev component patterns, lucide-react, Recharts |
| Backend | Supabase (Postgres + Auth, RLS) |
| Deploy | Vercel via GitHub git integration |

## Architecture notes
- **Multi-asset from the schema up:** `asset_class` (crypto / cfd / futures / equity) +
  per-instrument `multiplier`/`contract_size`. Futures columns are scaffolded now; futures
  parsing is deferred to the final phase.
- **Executions are the source of truth** (immutable fills). **Trades are derived** by an
  average-cost walk-to-flat reconstruction, with cached metric columns for fast dashboards.
- **Row Level Security** isolates every tenant (`auth.uid() = user_id`).

## Getting started (local)
```bash
npm install
cp .env.example .env.local   # fill Supabase keys (Phase 2)
npm run dev                  # http://localhost:3000
npm run build                # production build / typecheck gate
npm run lint
```

## Project lifecycle files
This project follows the workspace's 5-file lifecycle protocol (see parent
`../CLAUDE.md`). Project-local copies live here: `README.md`, `STATUS.md`, `PROGRESS.md`,
`DECISIONS.md`, `CLAUDE_MEMORY.md`. They are the source of truth for project state and are
updated at every phase boundary.

> ⚠️ This is **Next.js 16** — APIs differ from older versions. See `AGENTS.md` / `CLAUDE.md`
> and `node_modules/next/dist/docs/` before writing framework code.
