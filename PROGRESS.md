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
- **Open / HALT:** waiting for the user to connect GitHub→Vercel + first deploy, then "Proceed".
- **Note for Phase 2:** Next 16 renames middleware concepts — `node_modules/next/dist/docs/` has
  `16-proxy.md`. Read `02-guides/authentication.md`, `16-proxy.md`, `15-route-handlers.md`,
  `18-upgrading.md` before writing Supabase SSR/session code.
