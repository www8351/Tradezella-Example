# STATUS

_Last updated: 2026-06-18_

## Current State
**Phase 5 (Final: Futures, Prod Hardening, Deploy) — ✅ COMPLETE.**
All five phases done. Futures parsing (point-value contract specs) is implemented; the production
site is live and serving on Vercel; the Supabase security advisor is clean apart from one optional
Auth toggle. **48 unit tests pass; build + lint clean.** The app is feature-complete for v1; the
only remaining items are user-side production config (env/auth) and an optional custom domain.

## Done — all phases
- [x] Phase 1 — Next.js 16 scaffold + theme; GitHub `www8351/acTrade` (private); Vercel CI/CD.
- [x] Phase 2 — Supabase schema + RLS; Next 16 Proxy session; Google OAuth + email/password.
- [x] Phase 3 — Parsers (crypto/CFD), average-cost reconstruction, metrics, import action.
- [x] Phase 4 — Dashboard, trade log + detail, import/accounts/settings UI.
- [x] 2026-06-18 — Phase 5:
  - **Futures parsing**: contract specs (point value + tick size) for CME/CBOT/NYMEX/COMEX index,
    energy, metal, rate, grain majors + micros; `futuresRoot` strips month/year codes; "futures"
    import platform prices fills + completed trades by point value and records point_value/tick_size.
  - Verified prod is **live** (https://ac-trade-rose.vercel.app, HTTP 200). Final `get_advisors`: clean
    except `auth_leaked_password_protection` (optional toggle).
  - **Verified:** 48 vitest tests ✓; build ✓; lint ✓.

## Open / To Do — user-side production config
1. **Vercel env vars** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL=https://ac-trade-rose.vercel.app`) for **Production**, then redeploy.
2. **Supabase Auth** → URL config (Site URL + redirect URLs incl. `/auth/callback`).
3. **Google OAuth** provider (client ID/secret) + Google Cloud redirect `…supabase.co/auth/v1/callback`.
4. (Recommended) Supabase → Auth → enable **leaked-password protection**.
5. (Optional) **Custom domain** — currently `*.vercel.app`. Steps documented below / in PROGRESS.

## Blockers / Waiting On
- Production auth requires items 1–3 above (user dashboards). Code is ready and degrades gracefully until then.

## Known limitations (tracked)
- EU-locale numbers not auto-detected (explicit per-import locale — deferred).
- Cross-batch incremental closes not re-reconstructed.
- Futures `contract_expiry` left null (exact per-contract expiry derivation deferred; point_value/tick_size populated).
- Trade log single-page (no pagination yet).
- Custom domain deferred (`*.vercel.app`).

## Custom domain (when ready)
Vercel → project `ac-trade-rose` → Settings → Domains → add domain → follow the DNS records Vercel
shows (apex `A` → `76.76.21.21` or `CNAME` for `www` → `cname.vercel-dns.com`). Then update
`NEXT_PUBLIC_SITE_URL` + Supabase Auth URLs + Google OAuth origins to the new domain.

## Phase map
1. ✅ Init & Architecture
2. ✅ Database & Auth
3. ✅ Ingestion + reconstruction + metrics
4. ✅ Frontend & dashboard
5. ✅ Final: futures parsing, prod env, deploy verification
