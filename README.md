<div align="center">

# 📓 AcTrade — Trading Journal

### `multi-asset import` · `fill-level analytics` · `dark data-dense dashboard`

**A production-grade, TradeZella-style trading journal: import broker/exchange executions, reconstruct every trade, and see honest per-trade metrics on your edge.**
*יומן מסחר ברמת production בסגנון TradeZella: ייבוא ביצועים מברוקר/בורסה, שחזור כל עסקה, ומדדים כנים ברמת העסקה על ה-edge שלך.*

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16%20(Proxy)-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-48%20passing-6E9F18?logo=vitest&logoColor=white)
<br/>
[![Live demo](https://img.shields.io/badge/live-ac--trade--rose.vercel.app-000000?logo=vercel&logoColor=white)](https://ac-trade-rose.vercel.app)
![Status](https://img.shields.io/badge/v1-build%20complete-success)

</div>

---

## 🌍 What is this? · מה זה?

<table>
<tr>
<td width="50%" valign="top">

### 🇬🇧 English

A **production-grade trading-journal SaaS**. Traders import their broker/exchange
execution history; AcTrade reconstructs every trade (average-cost, walk-to-flat),
computes performance analytics, and presents them in a dark, data-dense dashboard.

Most traders never measure their own behavior. By turning raw executions into
**honest, per-trade metrics**, AcTrade makes the source of P&L visible and improvable.

**For** active retail traders across crypto (Binance/Coinbase/Bybit), CFD/forex
(MT4/MT5), futures (CME/CBOT/NYMEX/COMEX), and equities.

</td>
<td width="50%" valign="top">

<div dir="rtl">

### 🇮🇱 עברית

**יומן מסחר SaaS ברמת production.** סוחרים מייבאים היסטוריית ביצוע מהברוקר/בורסה;
AcTrade משחזר כל עסקה (עלות ממוצעת, walk-to-flat), מחשב אנליטיקת ביצועים ומציג
בדשבורד כהה וצפוף-נתונים.

רוב הסוחרים לא מודדים את ההתנהגות של עצמם. בהפיכת ביצועים גולמיים ל**מדדים כנים
ברמת העסקה**, AcTrade הופך את מקור ה-P&L לגלוי ולבר-שיפור.

**מיועד** לסוחרים קמעונאיים בקריפטו (Binance/Coinbase/Bybit), CFD/פורקס (MT4/MT5),
חוזים עתידיים (CME/CBOT/NYMEX/COMEX) ומניות.

</div>

</td>
</tr>
</table>

---

## ✨ Features

| Feature | What it does |
|---------|--------------|
| 🔀 **Multi-asset import** | Binance/Coinbase/Bybit fills · MT4/MT5 HTML + CSV · futures (point-value) · generic CSV. Content-hash dedup; malformed rows reported. |
| 🧮 **Trade reconstruction** | Average-cost walk-to-flat: scale-in/out, shorts, position flips, fee proration. Exact decimal math (no float drift). |
| 📊 **Analytics** | Net P&L, win rate, profit factor, avg R-multiple, max drawdown (abs + %), equity curve, timezone-aware daily P&L calendar heatmap. |
| 📋 **Trade log** | Sortable, filterable (symbol/side/status), detail view with executions ladder + editable journal notes. |
| ⚙️ **Accounts & settings** | Multiple accounts, base currency, profile timezone driving the calendar. |
| 🔐 **Auth** | Google OAuth + email/password; Row-Level Security isolates every user's data. |

---

## 🧱 Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js **16** (App Router, **Proxy** not Middleware), TypeScript, React 19 |
| Styling | Tailwind CSS **v4** · hand-written shadcn-style primitives |
| Charts / tables | Recharts · TanStack Table · date-fns |
| Backend | Supabase (Postgres + Auth, RLS) |
| Math / parsing | decimal.js · papaparse · node-html-parser · zod |
| Tests | Vitest (48 tests) |
| Deploy | Vercel via GitHub git integration (CI/CD on push to `main`) |

---

## 🚀 Getting started (local)

```bash
npm install
# .env.local already holds the Supabase URL + publishable key
npm run dev      # http://localhost:3000
npm run build    # production build / typecheck gate
npm run lint
npm test         # vitest (48 tests)
```

---

<details>
<summary><b>🗂️ Project structure</b></summary>

<br/>

```
src/
  app/
    (dashboard)/            # protected: layout (auth gate) + dashboard, trades[/id],
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

DB schema + RLS live in the Supabase project `actrade` (migrations `0001_init_schema`,
`0002_security_hardening`, applied via the Supabase MCP). DB types generated into
`src/types/database.ts`.

</details>

<details>
<summary><b>🏛️ Architecture notes</b></summary>

<br/>

- **Executions are the source of truth** (immutable fills). **Trades are derived** (average-cost),
  with cached metric columns for fast dashboards. Re-imports dedup by content hash — never double-count.
- **Multi-asset from the schema up:** `asset_class` + per-instrument `multiplier`; futures carry
  `point_value` / `tick_size`.
- **RLS** on every table (`auth.uid() = user_id`).

</details>

> ⚠️ This is **Next.js 16** — APIs differ from older versions (Middleware → Proxy, async `cookies()`).
> See `AGENTS.md` and `node_modules/next/dist/docs/` before writing framework code.

---

<div align="center">

**Built by [@www8351](https://github.com/www8351)** · Source: `github.com/www8351/acTrade` (private)

<sub>Executions are truth · trades are derived · exact decimal math.</sub>

</div>
