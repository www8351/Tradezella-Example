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
