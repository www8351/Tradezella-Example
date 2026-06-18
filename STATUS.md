# STATUS

_Last updated: 2026-06-18_

## Current State
**Phase 2 (Database & Authentication) — ✅ COMPLETE & VERIFIED.**
Supabase project `actrade` (`nazcnetdqdtflhcjdlsv`) holds the multi-asset schema with RLS on all
tables (security advisor: 0 warnings). `@supabase/ssr` clients, the Next.js 16 **Proxy** session
refresh, Google OAuth + email/password flows, and a protected `/dashboard` are wired and verified
live: `/dashboard` → 307 → `/login?redirect=%2Fdashboard` against real Supabase; `npm run build`
and `npm run lint` pass clean.

## Done
- [x] 2026-06-18 — Phase 1: Next.js 16 scaffold, theme, GitHub `www8351/acTrade` (private), live at
      https://ac-trade-rose.vercel.app.
- [x] 2026-06-18 — Phase 2:
  - Reused the user-created Supabase project `actrade` (org hit the 2 free-project limit; project
    was already there and empty). Applied `0001_init_schema` (profiles, accounts, setups, trades,
    executions) — multi-asset (`asset_class`, `multiplier`), futures-ready columns, indexes, RLS,
    triggers (`handle_new_user`, `updated_at`, dedupe-hash). `0002_security_hardening`.
  - Security advisor: **0 warnings** (search_path pinned; trigger fns revoked from API roles).
  - Generated `src/types/database.ts`. Clients: `lib/supabase/{client,server,session}.ts`, `src/proxy.ts`.
  - Auth: `actions/auth.ts` (password sign-in/up, Google OAuth, sign-out), `app/auth/callback/route.ts`,
    `app/login` + `components/auth/login-form.tsx`, DAL `lib/auth.ts`, protected `(dashboard)` group.
  - **Verified:** build ✓, lint ✓; live route probes — `/` 200, `/login` 200, `/dashboard` 307→/login.

## Open / To Do (current focus)
- [ ] **USER CONFIG (required for production auth to work):**
  1. Vercel → project `ac-trade-rose` → Settings → Environment Variables: add `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (= https://ac-trade-rose.vercel.app), then redeploy.
  2. Supabase → Authentication → URL Config: Site URL + Redirect URLs (localhost:3000 + the vercel.app URL + `/auth/callback`).
  3. Supabase → Authentication → Providers → Google: enable + paste Google Cloud OAuth client ID/secret.
- [ ] **HALT POINT:** awaiting explicit **"Proceed"** for Phase 3.

## Next Best Action
On **"Proceed"**: Phase 3 — ingestion pipeline (generic CSV + crypto Binance/Coinbase/Bybit +
CFD MT4/MT5 HTML+CSV), average-cost trade reconstruction, metrics module, import server action + tests.

## Blockers / Waiting On
- User to (a) set the 3 Vercel env vars + redeploy, (b) configure Supabase auth URLs + Google provider, (c) say **"Proceed"**.
- Code guards against missing env (proxy degrades to logged-out) so the prod site won't 500 before step (a).
- **Phase 5 note:** Vercel project `ac-trade-rose` still not in the MCP-visible team — env vars are user-set for now.

## Phase map
1. ✅ Init & Architecture
2. ✅ Database & Auth (Supabase project `actrade`, multi-asset schema, RLS, Proxy session, Google OAuth)
3. ⬜ Ingestion + reconstruction + metrics (crypto/CFD now; futures parsing deferred)
4. ⬜ Frontend & 21st.dev dashboard
5. ⬜ Final: futures parsing, prod env, deploy verification
