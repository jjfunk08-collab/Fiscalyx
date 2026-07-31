# TERMINAL — Multi-Asset Market Workstation

A Bloomberg Terminal–style, auto-updating market terminal built with **Next.js 14 (App Router) + TypeScript + Tailwind + Zustand + lightweight-charts**. It ships with a deterministic **mock streaming engine** so every panel stays live with **zero API keys**, and a **multi-provider abstraction** so you can drop in real data later without touching the UI.

> **Transport note:** Vercel's serverless runtime can't host a persistent WebSocket server, so the real-time layer uses a **1–5s polling loop** (the spec's sanctioned fallback) behind a clean `createLiveFeed()` subscribe/stop API. Deploy on a stateful host (Fly/Railway/VPS) and you can swap the internals for a native socket without changing any component.

---

## Features → Modules

| Function code | Module | What it does |
|---|---|---|
| `TOP` / `MON` | Market Monitor | Live multi-asset grid, class tabs, flashing green/red ticks, bid/ask/chg/high/low/vol |
| `GP` / `HP` | Charting | Candlesticks, SMA 20/50/200, volume, timeframe toggles (1D→MAX), **CSV export** |
| `DES` / `FA` | Fundamentals | Key metrics + Income / Balance / Cash-Flow with multi-year comparison |
| `NEWS` / `N` | News & Sentiment | Auto-refreshing feed, Bullish/Bearish/Neutral scoring, category + ticker filters |
| `ECO` / `FRED` | Macro Calendar | CPI, NFP, rate decisions, GDP, auctions with actual/forecast/previous |
| `YCRV` | Yield Curve | 1M→30Y treasury curve visualizer with day change in bp |
| `OMON` | Options | Call/Put chain with IV smile, Open Interest, Volume, ATM highlight |
| `HELP` | Help | Command reference (also `F1`) |

## Command line

```
<TICKER> [ASSET CLASS] <FUNCTION> [GO/Enter]
```

Examples: `AAPL US Equity GP` · `BTC Crypto DES` · `US10Y Bond YCRV` · `GOLD Commodity TOP` · `NVDA OMON` · `NEWS`

Asset class is optional (inferred from the ticker). Shortcuts: `/` focus · `Enter` run · `Esc` clear · `↑/↓` history · `F1` help · `F2` monitor · `F3` news.

---

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

No `.env` required — it runs entirely on the mock feed.

### Optional: enable real data

```bash
cp .env.example .env.local
# add any of: FINNHUB_API_KEY, ALPHAVANTAGE_API_KEY, FRED_API_KEY
# set NEXT_PUBLIC_FORCE_MOCK=false to allow live overlay
```

The provider layer overlays live values where a key exists and **falls back to mock automatically** on any missing key, rate limit, or network error — panels never blank out.

---

## Deploy

### A. Zip the project

From the folder that contains `bloomberg-terminal/`:

```bash
zip -r bloomberg-terminal.zip bloomberg-terminal \
  -x "*/node_modules/*" "*/.next/*" "*/.git/*"
```

### B. Push to GitHub

```bash
cd bloomberg-terminal
git init
git add .
git commit -m "feat: multi-asset market terminal"
git branch -M main
git remote add origin https://github.com/<you>/bloomberg-terminal.git
git push -u origin main
```

### C. Deploy on Vercel

**Dashboard:** vercel.com → **Add New → Project** → import the GitHub repo. Framework is auto-detected as **Next.js** — keep the defaults (Build `next build`, Output `.next`). Optionally add the env vars from `.env.example` under **Settings → Environment Variables**. Click **Deploy**.

**CLI:**
```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

That's it — no database, no serverless config. The API route handlers (`/api/market`, `/api/history`, `/api/news`) run as standard Next.js Route Handlers.

---

## Architecture

```
app/
  layout.tsx            root layout, JetBrains Mono via next/font
  page.tsx              workspace: 3-pane grid, function routing, shortcuts
  globals.css           terminal theme + panel chrome
  api/{market,news,history}/route.ts   provider abstraction + mock fallback
components/
  LiveProvider.tsx      runs the polling feed once; tick direction + audio ping
  TerminalHeader.tsx    clock, index ticker strip, F-keys, sound toggle
  CommandBar.tsx        parsing + autocomplete + history
  MarketGrid.tsx        Module B
  ChartView.tsx         Module C (lightweight-charts)
  FinancialsView.tsx    Module D
  NewsFeed.tsx          Module E
  YieldCurve.tsx        Module F (curve + econ calendar)
  OptionsChain.tsx      Module G
  HelpOverlay.tsx       F1 reference
lib/
  mock.ts               seeded RNG data engine (quotes/candles/news/econ/curve/options/fundamentals)
  api.ts                client fetchers with automatic mock fallback
  websocket.ts          createLiveFeed() real-time layer (polling; SSE-ready)
  store.ts              Zustand state + command parser
  utils.ts              formatters + cn()
types/index.ts          shared domain types
```

## Scope & honesty

This is a faithful **terminal-style workstation**, not a reproduction of Bloomberg's licensed data or its full function set. The data engine is simulated by design so the app is instantly runnable and never rate-limited; wire the provider layer to real feeds (Finnhub, Alpha Vantage, FRED, CoinGecko, SEC/openFDA) for production data. Not affiliated with or endorsed by Bloomberg L.P.
