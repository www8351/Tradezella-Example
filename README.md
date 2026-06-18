# AcTrade — Trading Journal

A production-grade, TradeZella-style **trading journal** SaaS. Traders import their broker/exchange
execution history; AcTrade reconstructs every trade, computes performance analytics, and presents
them in a dark, data-dense dashboard.

**Status:** v1 build complete (all 5 phases). Live at `https://ac-trade-rose.vercel.app`.
Source: `github.com/www8351/acTrade` (private). 48 unit tests · build · lint all green.

## Who it's for
Active retail traders across **crypto** (Binance, Coinbase, Bybit), **CFD/forex** (MT4/MT5),
**futures** (CME/CBOT/NYMEX/COMEX), and equities who want objective, fill-level feedback on their edge.

## Why it matters
Most traders never measure their own behavior. By turning raw executions into honest, per-trade
metrics, AcTrade makes the source of P&L visible and improvable.

## Features
- **Multi-asset import** — Binance/Coinbase/Bybit fills, MT4/MT5 HTML statements + CSV, futures
  (point-value priced), and a generic CSV format. Content-hash dedup; malformed rows reported.
- **Average-cost trade reconstruction** — walk-to-flat with scale-in/out, shorts, position flips,
  and fee proration. Exact decimal math (no float drift).
- **Analytics** — Net P&L, win rate, profit factor, average R-multiple, max drawdown (abs + %),
  equity curve, and a timezone-aware daily P&L calendar heatmap.
- **Trade log** — sortable, filterable (symbol / side / status), with a detail view showing the
  executions ladder and editable journal notes.
- **Accounts & settings** — multiple accounts, base currency, and a profile timezone that drives the calendar.
- **Auth** — Google OAuth + email/password; Row Level Security isolates every user's data.

## Tech stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js **16** (App Router, **Proxy** not Middleware), TypeScript, React 19 |
| Styling | Tailwind CSS **v4**, hand-written shadcn-style primitives |
| Charts / tables | Recharts, TanStack Table, date-fns |
| Backend | Supabase (Postgres + Auth, RLS) |
| Math / parsing | decimal.js, papaparse, node-html-parser, zod |
| Tests | Vitest (48 tests) |
| Deploy | Vercel via GitHub git integration (CI/CD on push to `main`) |

## Project structure
```
src/
  app/
    (dashboard)/            # protected group: layout (auth gate) + dashboard, trades[/id],
                            #   import, accounts, settings
    auth/callback/route.ts  # OAuth code exchange
    login/                  # auth UI
    layout.tsx · globals.css (theme) · page.tsx (landing)
  proxy.ts                  # Next 16 Proxy — Supabase session refresh
  actions/                  # server actions: auth, import, accounts, trades, profile, preferences
  components/               # ui/ dashboard/ charts/ trades/ accounts/ import/ settings/ auth/
  lib/
    supabase/{client,server,session}.ts
    trades/{reconstruct,pnl}.ts
    metrics/metrics.ts
    import/{columns,fills,completed,metatrader,contracts,dedupe,index}.ts
    data/trades.ts · auth.ts · utils.ts · format.ts
  types/{database,trading}.ts
```
Database schema + RLS live in the Supabase project `actrade` (migrations `0001_init_schema`,
`0002_security_hardening`, applied via the Supabase MCP — not as local files). DB types are
generated into `src/types/database.ts`.

## Getting started (local)
```bash
npm install
# .env.local already holds the Supabase URL + publishable key
npm run dev      # http://localhost:3000
npm run build    # production build / typecheck gate
npm run lint
npm test         # vitest (48 tests)
```

## Production / deployment
CI/CD: every push to `main` auto-deploys to Vercel. To make production auth work, set in the Vercel
project (Production env): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL`; configure Supabase Auth URLs + the Google provider. See `STATUS.md` for the
full go-live checklist and custom-domain steps.

## Architecture notes
- **Executions are the source of truth** (immutable fills). **Trades are derived** (average-cost),
  with cached metric columns for fast dashboards. Re-imports dedup by content hash and never
  double-count trades.
- **Multi-asset from the schema up:** `asset_class` + per-instrument `multiplier`; futures carry
  `point_value`/`tick_size`.
- **RLS** on every table (`auth.uid() = user_id`).

## Project lifecycle files
Follows the workspace's 5-file protocol (see parent `../CLAUDE.md`): `README.md`, `STATUS.md`,
`PROGRESS.md`, `DECISIONS.md`, `CLAUDE_MEMORY.md` — the source of truth for project state.

> ⚠️ This is **Next.js 16** — APIs differ from older versions (Middleware → Proxy, async `cookies()`).
> See `AGENTS.md` and `node_modules/next/dist/docs/` before writing framework code.
