# STATUS

_Last updated: 2026-06-18_

## Current State
**Phase 4 (Frontend & 21st.dev Dashboard) — ✅ COMPLETE & VERIFIED.**
Full dashboard UI: sidebar/header shell, performance dashboard (stat cards, Recharts equity curve,
PnL calendar heatmap), TanStack trade log with filters, trade detail with executions ladder +
journal notes, import UI, accounts, and settings. An adversarial review (10 agents) found 6 real
bugs — all fixed. **40 unit tests pass; build + lint clean.**

## Done
- [x] Phase 1 — Next.js 16 scaffold + theme; GitHub `www8351/acTrade` (private); live `*.vercel.app`.
- [x] Phase 2 — Supabase schema + RLS; Proxy session; Google OAuth + email/password; protected app.
- [x] Phase 3 — Parsers, average-cost reconstruction, metrics, import action (+ adversarial fixes).
- [x] 2026-06-18 — Phase 4:
  - UI primitives (card/button/badge), format helpers, server data layer (`lib/data/trades.ts`).
  - Layout: sidebar nav + header with cookie-persisted account switcher + sign-out.
  - Dashboard: 5 stat cards, equity curve (Recharts), tz-aware PnL calendar, recent trades, range tabs, empty state.
  - Trades: TanStack sortable table + URL filters; detail page (executions ladder + editable notes).
  - Import UI (platform + file → `importExecutions`, result panel); Accounts; Settings (profile/timezone).
  - **Adversarial review fixes:** intra-file duplicate-fill trade loss (regression), calendar timezone
    mismatch, swallowed link errors, unbounded execution fallback, null sort order, equity baseline x-dup.
  - **Verified:** 40 vitest tests ✓; `npm run build` ✓ (11 routes); `npm run lint` ✓.

## Open / To Do (current focus)
- [ ] **HALT POINT:** awaiting explicit **"Proceed"** for Phase 5.
- [ ] Carry-over (Phase 2, user): finish Google OAuth config + the 3 Vercel env vars (so prod auth works).

## Next Best Action
On **"Proceed"**: Phase 5 — implement deferred **futures parsing** (contract specs), push production env
vars + verify the Vercel build green, smoke-test prod (login → import → dashboard), final `get_advisors`.
This is also where the dashboard gets its first live end-to-end run.

## Blockers / Waiting On
- User to say **"Proceed"** for Phase 5.
- Dashboard's interactive/visual verification pending the user's first login (the authed UI can't be
  rendered headlessly); build + types + adversarial review cover correctness so far.

## Known limitations (tracked)
- EU-locale numbers not auto-detected (explicit per-import locale — deferred).
- Cross-batch incremental closes not re-reconstructed (new executions stored, trade deferred).
- Futures parsing deferred to Phase 5 (schema/types scaffolded).
- Trade log is single-page (no pagination yet) — fine for typical volumes.

## Phase map
1. ✅ Init & Architecture
2. ✅ Database & Auth
3. ✅ Ingestion + reconstruction + metrics
4. ✅ Frontend & dashboard
5. ⬜ Final: futures parsing, prod env, deploy verification
