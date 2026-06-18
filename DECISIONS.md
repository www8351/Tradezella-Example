# DECISIONS

## 2026-06-18 — Project-local lifecycle files for AcTrade
- **Decision:** Keep the 5 lifecycle files (README, STATUS, PROGRESS, DECISIONS, CLAUDE_MEMORY)
  inside `AcTrade/`, in addition to the workspace-root copies in the parent.
- **Why:** AcTrade is a self-contained, deployable product with its own git repo and CI/CD; the
  user explicitly asked for a project STATUS.md. Parent copies still govern the whole workspace.
- **Rejected:** Relying only on parent-root files (would bury AcTrade state among unrelated projects).
- **Status:** Final for this project.

## 2026-06-18 — Stack: Next.js 16 + Tailwind v4 + Supabase + Vercel(GitHub)
- **Decision:** App Router, TypeScript, React 19, Tailwind v4, Framer Motion, shadcn/21st.dev,
  Recharts; Supabase (Postgres+Auth+RLS); deploy via **GitHub→Vercel git integration**.
- **Why:** Matches the user's prescribed stack; GitHub integration gives CI/CD from Phase 1 and
  the user connects Vercel manually (their preference).
- **Rejected:** Vercel CLI deploy (original prompt's Phase 5) — superseded by git integration.
- **Status:** Final unless the user changes direction.

## 2026-06-18 — create-next-app produced Next.js 16 (breaking changes)
- **Decision:** Treat this as Next 16, not the Next we "know"; read the bundled docs in
  `node_modules/next/dist/docs/` before writing framework code (per scaffolded `AGENTS.md`).
- **Why:** Middleware/proxy, auth, and route-handler conventions changed (`16-proxy.md` exists).
- **Status:** Standing rule for all later phases.

## 2026-06-18 — Class-based dark mode + theme verbatim
- **Decision:** Use the user-supplied token CSS exactly; render `<html class="dark">` as the
  default and add `@custom-variant dark (&:is(.dark *))` so Tailwind v4 `dark:` keys follow the class.
- **Why:** User gave a complete blue shadcn palette and wants a dark, hardened aesthetic.
- **Status:** Final; theme toggle (light) can be added later — tokens already exist.

## 2026-06-18 — Skip `shadcn init`, configure manually
- **Decision:** Do not run `npx shadcn init`; write `components.json` + `cn()` by hand.
- **Why:** `shadcn init` rewrites `globals.css` and would clobber the hand-placed theme. The
  user's tokens already cover every shadcn variable, so `shadcn add <component>` still works.
- **Status:** Final.

## 2026-06-18 — Data model: average-cost reconstruction, executions as source of truth
- **Decision:** `executions` (immutable fills) are canonical; `trades` are derived by an
  **average-cost** walk-to-flat algorithm with cached metric columns. Position flips (cross
  through zero) split into two trades. Money math via a decimal library, never JS floats.
- **Why:** Average-cost gives one coherent per-trade P&L / avg entry / avg exit, matching how a
  journal presents a trade (FIFO fragments scale-outs and only matters for tax lots).
- **Rejected:** FIFO lot accounting (revisit only if tax-lot reporting becomes a requirement).
- **Status:** Final for v1.

## 2026-06-18 — Multi-asset schema now, futures parsing deferred
- **Decision:** Schema/types carry `asset_class` + `multiplier`/`contract_size` and nullable
  futures fields (tick_size, point_value, expiry) from Phase 2. Crypto + CFD parsers ship in
  Phase 3; **futures parsing implemented in the final phase**.
- **Why:** User's explicit instruction — scaffold futures structure early, defer parsing.
- **Status:** Final.

## 2026-06-18 — Reuse the existing `actrade` Supabase project
- **Decision:** Use the empty `actrade` project (`nazcnetdqdtflhcjdlsv`) the user had already
  created, rather than creating a new one.
- **Why:** `create_project` failed — the org is at the 2-active-free-project limit, and `actrade`
  already existed and was empty (0 tables / 0 migrations). Reuse = zero data loss, no upgrade needed.
- **Status:** Final.

## 2026-06-18 — dedupe_hash via trigger, not a generated column
- **Decision:** Compute `executions.dedupe_hash` in a BEFORE INSERT trigger (UTC-canonicalized),
  not a `generated always as ... stored` column.
- **Why:** Postgres rejected the generated column (`42P17`): `timestamptz::text` is not IMMUTABLE
  (depends on session timezone). Triggers aren't bound by that rule and keep dedup DB-enforced.
- **Status:** Final.

## 2026-06-18 — Next 16 Proxy for Supabase session refresh
- **Decision:** Session refresh lives in `src/proxy.ts` (Next 16's renamed Middleware), exporting
  `proxy`. Optimistic redirect only; secure auth = `getUser()` in Server Components/Actions (DAL
  `lib/auth.ts`). Proxy guards missing env to avoid prod 500s.
- **Why:** Next 16 renamed Middleware → Proxy; the docs prescribe optimistic-in-proxy + secure-at-source.
- **Status:** Final.

## 2026-06-18 — Vercel env vars set manually by user
- **Decision:** The 3 `NEXT_PUBLIC_*` vars + Supabase auth URLs + Google OAuth creds are configured
  in the Vercel/Supabase/Google dashboards by the user, not pushed via MCP.
- **Why:** The Vercel project `ac-trade-rose` lives in a scope the Vercel MCP token can't see.
- **Status:** Revisit in Phase 5 if MCP access to the project becomes available.
