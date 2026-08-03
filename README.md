# TERMINAL — Multi-Asset Market Workstation

A Bloomberg Terminal–style, auto-updating market terminal built with **Next.js 14 (App Router) + TypeScript + Tailwind + Zustand + lightweight-charts**. It fetches **real, live market data** entirely server-side, with a provider layer you can upgrade as you go:

| Data | No key (default) | With provider key |
| --- | --- | --- |
| US-equity quotes | Yahoo Finance | **Finnhub** (`FINNHUB_API_KEY`) |
| Equity news | Yahoo Finance search | **Finnhub** company/general news |
| Equity fundamentals | Yahoo `quoteSummary` | **Finnhub** metrics + as-reported statements |
| Chart candles | Yahoo `chart()` | **Twelve Data** (`TWELVEDATA_API_KEY`) → Yahoo fallback |
| Treasury yield curve | Yahoo CBOE proxy (4 tenors) | **FRED** (`FRED_API_KEY`) → full 1M–30Y curve |
| Economic calendar | — (empty state) | **FRED** release schedule (`FRED_API_KEY`) |
| Indices / commodities | Yahoo (often blocked) | **ETF proxies** via Finnhub/Twelve Data (e.g. SPX→SPY, OIL→USO, GOLD→GLD) |
| FX | Yahoo | **Twelve Data** (`TWELVEDATA_API_KEY`) |
| Crypto | CoinGecko | CoinGecko |

It runs with an **empty `.env`** (Yahoo + CoinGecko, keyless). Each key upgrades one area to a real keyed API; anything unset falls back to Yahoo. There is **no mock/fallback data** — panels show an explicit *Ticker Not Found* / *No Data Available* state when a source has nothing.

> **Provider notes:** Yahoo (`yahoo-finance2`) uses *unofficial* endpoints that rate-limit cloud/datacenter IPs (e.g. Vercel) — which is why **Twelve Data** (charts + index/FX/commodity quotes) and **FRED** (yields) exist as real keyed replacements. Twelve Data's free tier is ~800 credits/day and **bills per symbol**, so index/FX/commodity grid quotes are cached 60s server-side and treasury/chart data is cached too; continuous 24/7 viewing can still exhaust the free budget, at which point those rows fall back to Yahoo. Note Twelve Data's free tier may not include every index/commodity — uncovered symbols fall back to Yahoo automatically (FX, metals, and equities are the reliable free-tier wins). FRED requires an attribution line (shown in the yield panel) and is the official Fed source. Confirm each provider's commercial-use terms before charging for anything built on them.

> **Transport note:** Vercel's serverless runtime can't host a persistent WebSocket server, so the real-time layer uses a **~6s polling loop** (inside the 5–10s window the free endpoints are comfortable with) behind a clean `createLiveFeed()` subscribe/stop API. Deploy on a stateful host (Fly/Railway/VPS) and you can swap the internals for a native socket without changing any component.
>
> **Data caveat:** `yahoo-finance2` calls Yahoo's *unofficial* public endpoints. They require no key but can change or rate-limit without notice, and use is subject to Yahoo's terms — fine for a PoC, not a licensed production feed.

---

## Features → Modules

| Function code | Module | What it does |
|---|---|---|
| `TOP` / `MON` | Market Monitor | Live multi-asset grid, class tabs, flashing green/red ticks, bid/ask/chg/high/low/vol |
| `GP` / `HP` | Charting | Candlesticks, SMA 20/50/200, volume, timeframe toggles (1D→MAX), **CSV export** |
| `DES` / `FA` | Fundamentals | Key metrics + Income / Balance / Cash-Flow with multi-year comparison |
| `NEWS` / `N` | News & Sentiment | Auto-refreshing feed, Bullish/Bearish/Neutral scoring, category + ticker filters |
| `ECO` / `FRED` | Macro Calendar | Honest empty state — no free, keyless economic-calendar source |
| `YCRV` | Yield Curve | Partial live curve (13W · 5Y · 10Y · 30Y) from Yahoo CBOE yield indices, day change in bp |
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

**No `.env` required** — live data works out of the box (Yahoo Finance + CoinGecko, both keyless).

### Optional: add real keyed providers

All four keys are optional and independent — add any subset. On Vercel, set them
under **Settings → Environment Variables** (not committed to git), then redeploy.

```bash
cp .env.example .env.local
# FINNHUB_API_KEY=xxxx    → US-equity quotes / news / fundamentals via Finnhub
# TWELVEDATA_API_KEY=xxxx → chart candles via Twelve Data (fixes Yahoo IP throttling)
# FRED_API_KEY=xxxx       → full 1M–30Y Treasury curve via the Federal Reserve
# COINGECKO_API_KEY=xxxx  → only if you hit CoinGecko 429s
```

Where to get each free key:
- **Finnhub** — https://finnhub.io/register
- **Twelve Data** — https://twelvedata.com/pricing (the free "Basic" plan, ~800 calls/day)
- **FRED** — https://fredaccount.stlouisfed.org/apikeys (free St. Louis Fed account)
- **CoinGecko** — https://www.coingecko.com/en/api (demo key optional)

Each panel reports its live source: the status bar shows the quote mix
(e.g. `finnhub · coingecko · yahoo`), the chart's history source is in the API
response, and the yield panel prints `fred` vs the Yahoo proxy note.

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

That's it — no database, no serverless config. The API route handlers (`/api/market`, `/api/history`, `/api/news`, `/api/fundamentals`, `/api/options`, `/api/yields`) run as standard Next.js Route Handlers on the **Node.js runtime** (required by `yahoo-finance2`).

---

## Architecture

```
app/
  layout.tsx            root layout, JetBrains Mono via next/font
  page.tsx              workspace: 3-pane grid, function routing, shortcuts
  globals.css           terminal theme + panel chrome
  api/market/route.ts        live quotes (Yahoo + CoinGecko), fundamentals fields
  api/history/route.ts       live OHLC candles (Yahoo chart / CoinGecko ohlc)
  api/news/route.ts          live headlines (Yahoo search) + keyword classifiers
  api/fundamentals/route.ts  company statements (Yahoo quoteSummary)
  api/options/route.ts       options chain (Yahoo options)
  api/yields/route.ts        treasury yields (Yahoo CBOE indices)
components/
  LiveProvider.tsx      runs the polling feed once; tick direction + audio ping
  TerminalHeader.tsx    clock, index ticker strip, F-keys, sound toggle
  CommandBar.tsx        parsing + autocomplete + history
  MarketGrid.tsx        Module B
  ChartView.tsx         Module C (lightweight-charts, intraday polling)
  FinancialsView.tsx    Module D
  NewsFeed.tsx          Module E
  YieldCurve.tsx        Module F (live curve + honest empty econ calendar)
  OptionsChain.tsx      Module G
  HelpOverlay.tsx       F1 reference
lib/
  universe.ts           static symbol registry → Yahoo tickers / CoinGecko ids
  finnhub.ts            server-only Finnhub wrappers (quote/news/metric/financials)
  twelvedata.ts         server-only Twelve Data wrapper (chart candles)
  fred.ts               server-only FRED wrapper (Treasury yield curve)
  yahoo.ts              server-only yahoo-finance2 wrappers
  coingecko.ts          CoinGecko fetchers (+ short TTL cache)
  api.ts                client fetchers → typed {data, error, notFound} results
  websocket.ts          createLiveFeed() polling layer
  store.ts              Zustand state + command parser
  utils.ts              formatters + cn()
types/index.ts          shared domain types
```

## Scope & honesty

This is a **proof of concept** terminal-style workstation, not a reproduction of Bloomberg's licensed data or its full function set. All prices, charts, news, fundamentals, options and yields are **real, live data** pulled from Yahoo Finance and CoinGecko at request time — there is no mock/simulated data anywhere.

Honest limitations of the key-free approach:

- **Yahoo endpoints are unofficial.** `yahoo-finance2` uses Yahoo's public-but-undocumented endpoints; they can break, throttle, or change field shapes without notice, and their use is subject to Yahoo's terms. Suitable for a PoC, not a licensed production feed.
- **Fundamentals & options field shapes** are read defensively; if Yahoo renames a nested field, the affected panel shows *No Data Available* rather than a wrong number.
- **Treasury curve is partial** (13W · 5Y · 10Y · 30Y — the tenors Yahoo exposes). A full 1M–30Y curve needs a FRED / US Treasury source.
- **Economic calendar** has no free, keyless source, so it is intentionally left as an empty state instead of fabricated events.
- **Crypto candles** come from CoinGecko's free `/ohlc` endpoint, which omits volume and caps deep history — the 5Y/MAX crypto views are limited to ~1y.
- **Treasury yield scaling:** Yahoo's `^TNX`/`^FVX`/`^TYX`/`^IRX` are passed through as the raw index value; verify the magnitude against a known reference on first run.

Not affiliated with or endorsed by Bloomberg L.P.
