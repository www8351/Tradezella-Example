# PROGRESS

## 2026-06-18 — Phase 1: Initialization & Architecture
- **Planned:** Greenfield trading-journal build. Resolved key decisions with the user: new
  dedicated Supabase project `actrade`; Google OAuth (+ email/password fallback); `*.vercel.app`
  for now; **GitHub→Vercel git integration** (user connects manually) instead of Vercel CLI;
  multi-asset scope — crypto (Binance/Coinbase/Bybit CSV, API later), CFD (MT4/MT5 HTML+CSV),
  futures (scaffold schema/types now, defer parsing to final phase).
- **Scaffolded:** `npx create-next-app` produced **Next.js 16.2.9** (not 15 — breaking changes;
  `AGENTS.md` warns to read `node_modules/next/dist/docs/` before framework code). Created into a
  lowercase subdir (`create-next-app` rejects the capitalized `AcTrade` dir name) then moved
  contents to the project root.
- **Themed:** replaced `globals.css` with the user's exact token set (light + `.dark` + `@theme
  inline`); added `@custom-variant dark (&:is(.dark *))` for class-based dark mode (we render
  `<html class="dark">`). Loaded Inter / JetBrains Mono / Source Serif 4 via `next/font/google`
  with CSS variables and referenced them from the font tokens.
- **Tooling:** installed framer-motion, lucide-react, clsx, tailwind-merge, class-variance-authority;
  added `cn()` and `components.json`. **Skipped `npx shadcn init`** to avoid it overwriting the
  hand-placed theme — config written manually; `shadcn add` will still work.
- **Worked:** `npm run build` ✓ (compiled in ~2.5s, TypeScript clean, `/` + `/_not-found`
  prerendered static), `npm run lint` ✓ (no errors).
- **Did not work / fixed:** initial `create-next-app .` failed — `name can no longer contain
  capital letters` (dir is `AcTrade`). Fixed by scaffolding into `actrade-app/` and moving up.
- **Pushed:** committed Phase 1 on `main`, then pushed to **github.com/www8351/acTrade**.
  Snags handled: (1) `gh repo create actrade` failed — a repo `acTrade` (note capital T) already
  existed (user-created, public, Hebrew "trading journal" desc, only `.gitattributes`); confirmed
  with the user to adopt it. (2) Flipping it public→PRIVATE briefly returned `remote: Your
  repository is disabled` / HTTP 403 — transient during the visibility transition; resolved on
  retry (`disabled:false`). (3) Rebased my 2 commits onto the remote's `.gitattributes` initial
  commit (preserved it) and fast-forward pushed — no force needed.
- **PowerShell note:** `2>&1` on git makes `$?` false even on success (5.1 NativeCommandError);
  switched to `$LASTEXITCODE` for control flow.
- **Deploy:** user connected Vercel. First import (personal scope) returned **Ready-but-404** at the
  root — a Vercel project-config issue, not the code (local `next build` serves `/`). Re-imported the
  repo into a team scope; Vercel suffixed the slug to **`ac-trade-rose`**. Verified via WebFetch:
  **https://ac-trade-rose.vercel.app → HTTP 200**, landing page renders (title, heading, nav, features).
  404 resolved. **Phase 1 fully complete.**
- **MCP caveat:** the deployed project isn't visible to the Vercel MCP token's team (`get_project`
  404, `list_projects` empty) — it's in a scope the token can't reach. Flagged for Phase 5 env-var push.
- **HALT:** awaiting explicit "Proceed" before Phase 2.
- **Note for Phase 2:** Next 16 renames middleware concepts — `node_modules/next/dist/docs/` has
  `16-proxy.md`. Read `02-guides/authentication.md`, `16-proxy.md`, `15-route-handlers.md`,
  `18-upgrading.md` before writing Supabase SSR/session code.

## 2026-06-18 — Phase 2: Database & Authentication
- **Docs read first (Next 16):** `16-proxy.md` (Middleware → **Proxy**: `src/proxy.ts`, export `proxy`,
  Node runtime), `authentication.md` (optimistic check in proxy, secure check via `getUser()` in
  RSC/actions), `route-handlers.md` (`cookies()` is async).
- **Supabase project:** `get_cost` = **$0/mo** (free). `create_project` failed — org at the **2 free
  project limit**; re-listing showed the user had already created an empty `actrade` project
  (`nazcnetdqdtflhcjdlsv`) earlier today. Reused it (empty: 0 tables / 0 migrations).
- **Schema (`0001_init_schema`):** 5 tables (profiles, accounts, setups, trades, executions) with
  multi-asset columns (`asset_class`, `multiplier`/`contract_size`) + futures-ready scaffold
  (tick_size, point_value, contract_expiry). Indexes for dashboard hot paths. RLS on all tables
  using `(select auth.uid())` (pre-empts the perf advisor). Triggers: `handle_new_user`,
  `set_updated_at`, dedupe-hash.
- **Fixed:** generated `dedupe_hash` column → `42P17 generation expression is not immutable`
  (`timestamptz::text` depends on session TZ). Switched to a BEFORE INSERT trigger
  (`set_execution_dedupe_hash`, canonicalizes to UTC) — not bound by the immutability rule.
- **Security advisor:** flagged mutable search_path on 2 trigger fns + SECURITY DEFINER fns callable
  via RPC (incl. a pre-existing `rls_auto_enable` event trigger). `0002_security_hardening`: pinned
  search_path + revoked EXECUTE from anon/authenticated/public. **Re-run → 0 warnings.**
- **App layer:** installed `@supabase/ssr`, `@supabase/supabase-js`, `zod`. Wrote `src/types/database.ts`,
  `lib/supabase/{client,server,session}.ts`, `src/proxy.ts` (Next 16 proxy), `lib/auth.ts` DAL
  (`getUser`/`requireUser`), `actions/auth.ts`, `app/auth/callback/route.ts`, `app/login` +
  `components/auth/login-form.tsx`, protected `(dashboard)` group. `.env.local` filled with the
  publishable key.
- **Hardening:** proxy guards missing env (degrades to logged-out) so prod won't 500 before Vercel
  env vars are set.
- **Verified:** `npm run build` ✓, `npm run lint` ✓. Dev server probe (port 3987 — 3000/3100 were
  taken): `/` 200, `/login` 200, `/dashboard` → **307 → `/login?redirect=%2Fdashboard`** against
  live Supabase. Auth gate works end-to-end.
- **Open / HALT:** user to set Vercel env vars + Supabase auth URLs + Google OAuth creds, then "Proceed".
- **OAuth 500 fix (post-Phase-2):** after Google config, prod `/auth/callback` 500'd because the running
  build predated the env vars. Hardened the callback (env guard + try/catch → `/login?error=` instead of
  500) and pushed (fresh build picks up env).

## 2026-06-18 — Phase 3: Ingestion, Reconstruction & Metrics
- **Built:** parser layer (`src/lib/import/`) — tolerant CSV coercion (`columns.ts`), crypto fill adapters
  (Binance/Coinbase/Bybit via flexible `fills.ts`), `completed.ts` (one trade per entry+exit row),
  `metatrader.ts` (MT4/5 HTML statements, disambiguating duplicate Time/Price columns), `contracts.ts`
  (CFD/forex contract sizes), `index.ts` dispatcher (HTML/CSV + fill/completed auto-detect). Average-cost
  walk-to-flat reconstruction (`reconstruct.ts`) + decimal PnL (`pnl.ts`). Metrics module. `import.ts` +
  `accounts.ts` server actions. vitest toolchain.
- **Design call:** fill sources (crypto) are reconstructed; completed-trade sources (MT4/5, generic
  entry+exit) become one trade per row directly — re-netting would wrongly merge concurrent same-symbol
  positions. Unified via `IngestResult` (executions + trades + executionIndexes linkage).
- **Fixed during build:** generated `dedupe_hash` immutability (→ trigger), `maxPct` CFA-narrowed-to-never
  (→ inline loop, no closure), zod transform+default friction.
- **Verified DB mechanism:** confirmed `ON CONFLICT (user_id, dedupe_hash)` dedup works with a
  trigger-populated column (temp-table SQL test → 2 of 3 rows inserted).
- **Adversarial review (workflow, 15 agents, 4 dimensions):** 11 raw findings → 9 confirmed real. Fixed 8:
  (1) CRITICAL naked/MT timestamps parsed in server-local TZ → now normalized to UTC; (2) CRITICAL duplicate
  trades on partial re-import → trades gated to all-new executions + `executions.trade_id` linking added;
  (3) accounting negatives with trailing suffix `"(100) USD"`; (4) trade_id never linked → now linked;
  (5) garbage cell → 0 instead of null; (6/8) decimal default-20-digit precision noise → `Decimal.set(40)`;
  (7) wrong skipped-row line numbers (blank lines / MT-HTML offset) → true source lines tracked.
  Deferred (9): EU-locale numbers (auto-detect is ambiguous; needs explicit per-import locale).
- **Tests:** 27 → **37 vitest tests** (added date/number coercion, UTC ordering, precision, row-number,
  accounting-negative cases). `npm run build` ✓, `npm run lint` ✓.
- **Open / HALT:** awaiting "Proceed" for Phase 4 (UI exercises the import pipeline end-to-end vs the DB).

## 2026-06-18 — Phase 4: Frontend & Dashboard
- **Approach:** hand-written shadcn-style primitives + native form controls (no Radix), Recharts for the
  equity curve, TanStack Table for the trade log, date-fns. Account selection via a cookie + switcher.
- **Built:** UI primitives (`components/ui/{card,button,badge}`), `lib/format.ts`, server data layer
  (`lib/data/trades.ts`: getTrades/getTrade/getTradeExecutions/getDashboardData/getActiveAccount).
  Layout shell (sidebar + header + account-switcher). Dashboard page (stat cards, equity curve,
  PnL calendar, recent trades, range tabs). Trades page (TanStack table + URL filter bar). Trade
  detail (`[id]`) with executions ladder + notes editor. Import page + form. Accounts page + form.
  Settings page + profile form. Server actions: trades (notes), profile, preferences (active account).
- **Verified pre-review:** `npm run build` ✓ (11 routes), 37 tests ✓. Fixed a Recharts 3 Tooltip
  readonly-payload type error.
- **Adversarial review (workflow, 10 agents, 4 dimensions):** 6 findings, all 6 confirmed real, all fixed:
  (1) HIGH — intra-file duplicate fill collapsed by `ON CONFLICT DO NOTHING` made the all-new-exec trade
  gate drop a legitimate trade on FIRST import (regression from the Phase 3 dedup gate) → added
  `dedupeExecutions` (content-key collapse + index remap, unit-tested). (2) HIGH — calendar cells keyed
  in server-local TZ vs profile-TZ buckets → threaded `tz` through and rebuilt the grid on UTC-anchored
  dates. (3) MEDIUM — swallowed `executions.trade_id` link errors → captured + surfaced a warning.
  (4) MEDIUM — `getTradeExecutions` fallback unbounded for open trades / pulled other trades' fills →
  closed-only, bounded, `trade_id IS NULL`. (5) LOW — null net_pnl/R sorted as 0 → `accessorFn` +
  `sortUndefined: 'last'`. (6) LOW — equity baseline reused the first trade's timestamp (duplicate x) →
  anchored one day earlier.
- **Tests:** 37 → **40** (added `dedupeExecutions` cases). build ✓, lint ✓ (silenced the benign
  TanStack/React-Compiler memoization warning).
- **Note:** the authed dashboard can't be rendered headlessly (auth gate) — interactive verification
  awaits the user's first login, which also exercises the import pipeline end-to-end.
- **Open / HALT:** awaiting "Proceed" for Phase 5 (futures parsing + prod verification).

## 2026-06-18 — Phase 5: Futures parsing + production verification
- **Futures parsing:** added `contracts.ts` FUTURES_SPECS (point value + tick size per root) covering
  CME/CBOT/NYMEX/COMEX index/energy/metal/rate/grain majors + micros; `futuresRoot` strips trailing
  month/year codes via regex (`ESZ5`→`ES`, `MNQH26`→`MNQ`, `6EU5`→`6E`); `futuresContract` returns
  {multiplier=pointValue, tickSize, pointValue}. Added "futures" platform to the dispatcher — prices
  fills (NinjaTrader-style) and completed trades (Tradovate-style) by point value, asset_class=futures.
- **Plumbing:** unified the per-symbol contract lookup as `contractFor` across `parseFills` and
  `parseCompletedCsv` (replacing `multiplierFor`); MT path passes a CFD `contractFor`. Added optional
  `tickSize`/`pointValue`/`contractExpiry` to `ReconstructedTrade` (kept `reconstruct.ts` untouched —
  fields default undefined for the fills path) and persisted them in the import action. `contract_expiry`
  left null (exact per-contract expiry deferred).
- **Verified:** 42 → **48 vitest tests** (added futures fills/completed + contract-spec/root edge cases).
  build ✓, lint ✓.
- **Production:** pushed (auto-deploy); confirmed **https://ac-trade-rose.vercel.app serves HTTP 200**
  (landing renders). Final Supabase `get_advisors`: clean except `auth_leaked_password_protection`
  (optional Auth dashboard toggle — flagged for the user).
- **Note:** Vercel project `ac-trade-rose` still outside the MCP-visible team, so prod env vars + the
  login smoke test remain user-side (documented in STATUS). Build/types/tests + two adversarial review
  passes cover correctness.
- **Project build complete (v1).** Remaining work is user-side prod config + optional custom domain.
