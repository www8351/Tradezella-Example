# CLAUDE_MEMORY (AcTrade)

## Persona & Communication
- Direct, concise, no pleasantries, no hedging. Lead with the outcome.
- Caveman mode (full) active via session hook: compressed prose; **code, commits, SQL, and
  security warnings written normally**.

## Operational Rules (persistent)
- Strict sequential phase execution. **HALT and verify** at the end of every step (lint/build/tests),
  then wait for the user's explicit **"Proceed"** before the next step.
- On any error: stop, output the exact error, propose + apply a fix, re-verify before moving on.
- **No stubs.** Production-ready code: robust error handling, strong types, secure-by-design.
- Update lifecycle files autonomously at each phase boundary: STATUS + PROGRESS on task
  completion; DECISIONS on architectural shifts/rejected paths; README on stack/direction change;
  this file when core rules evolve.

## Environment
- Windows 11, PowerShell 5.1 (no `&&`/`||`, no ternary; write files `-Encoding utf8`).
- Project root: `C:\Users\www83\Downloads\AI\AcTrade` (its own git repo).
- Node v24.15.0, npm 11.17.0, git 2.53.0, `gh` 2.92.0 (authed as `www8351`).
- Supabase MCP + Vercel MCP available. User email: www8351@gmail.com.

## Technical Stack (locked)
- Next.js **16** (App Router) + TypeScript + React 19; Tailwind **v4**; Framer Motion;
  shadcn/21st.dev + lucide-react + Recharts; Supabase (Postgres+Auth+RLS); Vercel via GitHub.
- ⚠️ **Next.js 16 ≠ training data.** Read `node_modules/next/dist/docs/` (esp. `16-proxy.md`,
  `02-guides/authentication.md`, `15-route-handlers.md`, `18-upgrading.md`) before framework code.

## Product invariants
- `executions` immutable source of truth; `trades` derived (average-cost, walk-to-flat, cached
  metrics). Decimal math, never floats. RLS isolates tenants (`auth.uid() = user_id`).
- Multi-asset: crypto / cfd / futures / equity via `asset_class` + `multiplier`. Futures parsing
  deferred to the final phase.

## Security / Hardening
- No secrets in code or these files. `.env.local` gitignored; service-role key server-only.
- RLS on every table; reconstruction never trusts client-supplied `user_id`.
- Confirm before destructive/irreversible operations and before incurring cloud cost
  (Supabase project creation → confirm cost first).
