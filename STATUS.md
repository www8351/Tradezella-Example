# STATUS

_Last updated: 2026-06-18_

## Current State
**Phase 3 (Ingestion, Reconstruction & Metrics) — ✅ COMPLETE & VERIFIED.**
Parsers (crypto fills, generic, MT4/MT5 HTML+CSV), average-cost trade reconstruction, the metrics
module, and the import/account server actions are built and tested. An adversarial multi-agent
review (4 dimensions, 15 agents) surfaced 9 real bugs; 8 were fixed (the 9th, EU-locale numbers,
is deferred with a documented limitation). **37 unit tests pass; build + lint clean.**

## Done
- [x] 2026-06-18 — Phase 1: Next.js 16 scaffold + theme; GitHub `www8351/acTrade` (private); live `*.vercel.app`.
- [x] 2026-06-18 — Phase 2: Supabase `actrade` schema + RLS (advisor 0 warnings); Proxy session; Google OAuth + email/password; protected `/dashboard`.
- [x] 2026-06-18 — Phase 3:
  - `src/lib/import/`: tolerant CSV column/value coercion, crypto fill adapters (Binance/Coinbase/Bybit),
    generic (fills *and* completed-trade rows), MetaTrader HTML statement + CSV (CFD contract sizing).
  - `src/lib/trades/`: average-cost walk-to-flat reconstruction (`reconstruct.ts`) + decimal PnL (`pnl.ts`).
  - `src/lib/metrics/metrics.ts`: net PnL, win rate, profit factor, avg R, max drawdown, equity curve, PnL-by-day.
  - `src/actions/import.ts` (parse → dedup-insert executions → gated trades → link trade_id), `accounts.ts`.
  - **Adversarial review + fixes:** UTC timestamp normalization, no-double-count on re-import + execution↔trade
    linking, accounting-negative parsing, garbage→null coercion, decimal precision (40 digits), true source
    line numbers.
  - **Verified:** 37 vitest tests ✓; `npm run build` ✓; `npm run lint` ✓; DB dedup mechanism confirmed via SQL.

## Open / To Do (current focus)
- [ ] **HALT POINT:** awaiting explicit **"Proceed"** for Phase 4 (dashboard UI).
- [ ] Carry-over for the user (Phase 2): finish Google OAuth config + the 3 Vercel env vars (so prod auth works).

## Next Best Action
On **"Proceed"**: Phase 4 — dashboard layout (sidebar/header), performance dashboard (stat cards, equity
curve, PnL calendar heatmap), trade log table with filters, trade detail view, and the import UI that
drives `importExecutions`. This is where the import pipeline gets exercised end-to-end against the DB.

## Blockers / Waiting On
- User to say **"Proceed"** for Phase 4.

## Known limitations (tracked)
- **EU-locale numbers** (`1.234,56`) are not auto-detected — needs an explicit per-import locale (deferred).
- **Cross-batch incremental closes**: a trade opened in one import and closed by a later import isn't
  re-reconstructed yet (its new executions are stored but unlinked). Full re-reconstruction is a later refinement.
- Per-trade `trade_id` link uses one update per trade — fine for normal imports; batch if very large.
- **Futures parsing** remains deferred to Phase 5 (schema/types already scaffolded).

## Phase map
1. ✅ Init & Architecture
2. ✅ Database & Auth
3. ✅ Ingestion + reconstruction + metrics
4. ⬜ Frontend & 21st.dev dashboard
5. ⬜ Final: futures parsing, prod env, deploy verification
