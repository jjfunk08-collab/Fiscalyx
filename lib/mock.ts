// ============================================================
//  MOCK DATA ENGINE
//  Deterministic-per-symbol pseudo-random generators so the
//  terminal always renders realistic data — even with zero API
//  keys or when a real provider is rate-limited. Charts are
//  stable across reloads (seeded), while live ticks drift.
// ============================================================

import type {
  AssetClass,
  Candle,
  EconEvent,
  Fundamentals,
  Instrument,
  NewsItem,
  OptionRow,
  OptionsChain,
  Quote,
  Sentiment,
  Timeframe,
  YieldPoint,
} from "@/types";

// ---------- Seeded RNG (mulberry32) ----------
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seeded(symbol: string, salt = "") {
  return mulberry32(hashString(symbol + "|" + salt));
}

// ---------- Instrument universe ----------
export const UNIVERSE: Instrument[] = [
  // Equities
  { symbol: "AAPL", name: "Apple Inc", assetClass: "Equity", currency: "USD", sector: "Technology", basePrice: 224.5 },
  { symbol: "MSFT", name: "Microsoft Corp", assetClass: "Equity", currency: "USD", sector: "Technology", basePrice: 452.1 },
  { symbol: "NVDA", name: "NVIDIA Corp", assetClass: "Equity", currency: "USD", sector: "Semiconductors", basePrice: 126.4 },
  { symbol: "AMZN", name: "Amazon.com Inc", assetClass: "Equity", currency: "USD", sector: "Consumer Disc", basePrice: 198.2 },
  { symbol: "GOOGL", name: "Alphabet Inc", assetClass: "Equity", currency: "USD", sector: "Communication", basePrice: 178.9 },
  { symbol: "META", name: "Meta Platforms", assetClass: "Equity", currency: "USD", sector: "Communication", basePrice: 512.3 },
  { symbol: "TSLA", name: "Tesla Inc", assetClass: "Equity", currency: "USD", sector: "Auto", basePrice: 248.7 },
  { symbol: "JPM", name: "JPMorgan Chase", assetClass: "Equity", currency: "USD", sector: "Financials", basePrice: 210.6 },
  { symbol: "BHVN", name: "Biohaven Ltd", assetClass: "Equity", currency: "USD", sector: "Biotech", basePrice: 44.8 },
  { symbol: "XOM", name: "Exxon Mobil Corp", assetClass: "Equity", currency: "USD", sector: "Energy", basePrice: 117.9 },

  // Indices
  { symbol: "SPX", name: "S&P 500 Index", assetClass: "Index", currency: "USD", basePrice: 5590.0 },
  { symbol: "NDX", name: "Nasdaq 100 Index", assetClass: "Index", currency: "USD", basePrice: 19850.0 },
  { symbol: "DJI", name: "Dow Jones Ind Avg", assetClass: "Index", currency: "USD", basePrice: 40100.0 },
  { symbol: "UKX", name: "FTSE 100 Index", assetClass: "Index", currency: "GBP", basePrice: 8200.0 },
  { symbol: "DAX", name: "DAX 40 Index", assetClass: "Index", currency: "EUR", basePrice: 18450.0 },
  { symbol: "N225", name: "Nikkei 225", assetClass: "Index", currency: "JPY", basePrice: 39500.0 },
  { symbol: "VIX", name: "CBOE Volatility Idx", assetClass: "Index", currency: "USD", basePrice: 15.2 },

  // FX
  { symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "FX", currency: "USD", basePrice: 1.0842 },
  { symbol: "GBPUSD", name: "Pound / US Dollar", assetClass: "FX", currency: "USD", basePrice: 1.2785 },
  { symbol: "USDJPY", name: "US Dollar / Yen", assetClass: "FX", currency: "JPY", basePrice: 157.35 },
  { symbol: "USDCHF", name: "US Dollar / Franc", assetClass: "FX", currency: "CHF", basePrice: 0.8955 },
  { symbol: "AUDUSD", name: "Aussie / US Dollar", assetClass: "FX", currency: "USD", basePrice: 0.6675 },
  { symbol: "USDCAD", name: "US Dollar / Loonie", assetClass: "FX", currency: "CAD", basePrice: 1.3712 },

  // Commodities
  { symbol: "GOLD", name: "Gold Spot / oz", assetClass: "Commodity", currency: "USD", basePrice: 2398.0 },
  { symbol: "SILVER", name: "Silver Spot / oz", assetClass: "Commodity", currency: "USD", basePrice: 29.4 },
  { symbol: "OIL", name: "WTI Crude / bbl", assetClass: "Commodity", currency: "USD", basePrice: 81.2 },
  { symbol: "BRENT", name: "Brent Crude / bbl", assetClass: "Commodity", currency: "USD", basePrice: 85.1 },
  { symbol: "NATGAS", name: "Natural Gas / MMBtu", assetClass: "Commodity", currency: "USD", basePrice: 2.31 },
  { symbol: "COPPER", name: "Copper / lb", assetClass: "Commodity", currency: "USD", basePrice: 4.42 },
  { symbol: "WHEAT", name: "Wheat / bu", assetClass: "Commodity", currency: "USD", basePrice: 5.68 },
  { symbol: "CORN", name: "Corn / bu", assetClass: "Commodity", currency: "USD", basePrice: 4.02 },

  // Crypto
  { symbol: "BTC", name: "Bitcoin", assetClass: "Crypto", currency: "USD", basePrice: 64200.0 },
  { symbol: "ETH", name: "Ethereum", assetClass: "Crypto", currency: "USD", basePrice: 3420.0 },
  { symbol: "SOL", name: "Solana", assetClass: "Crypto", currency: "USD", basePrice: 148.0 },
  { symbol: "XRP", name: "Ripple", assetClass: "Crypto", currency: "USD", basePrice: 0.612 },
  { symbol: "DOGE", name: "Dogecoin", assetClass: "Crypto", currency: "USD", basePrice: 0.124 },

  // Sovereign bonds (quoted as yield %)
  { symbol: "US2Y", name: "US 2Y Treasury", assetClass: "Bond", currency: "USD", basePrice: 4.72 },
  { symbol: "US5Y", name: "US 5Y Treasury", assetClass: "Bond", currency: "USD", basePrice: 4.38 },
  { symbol: "US10Y", name: "US 10Y Treasury", assetClass: "Bond", currency: "USD", basePrice: 4.28 },
  { symbol: "US30Y", name: "US 30Y Treasury", assetClass: "Bond", currency: "USD", basePrice: 4.45 },
  { symbol: "DE10Y", name: "German 10Y Bund", assetClass: "Bond", currency: "EUR", basePrice: 2.51 },
  { symbol: "GB10Y", name: "UK 10Y Gilt", assetClass: "Bond", currency: "GBP", basePrice: 4.12 },
  { symbol: "JP10Y", name: "Japan 10Y JGB", assetClass: "Bond", currency: "JPY", basePrice: 1.06 },
];

const BY_SYMBOL = new Map(UNIVERSE.map((i) => [i.symbol, i]));

export function findInstrument(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol.toUpperCase());
}

export function instrumentsByClass(assetClass: AssetClass): Instrument[] {
  return UNIVERSE.filter((i) => i.assetClass === assetClass);
}

// ---------- Quotes ----------
// Volatility scaling per asset class (roughly per-day sigma).
function classVol(assetClass: AssetClass): number {
  switch (assetClass) {
    case "Crypto":
      return 0.045;
    case "Commodity":
      return 0.02;
    case "FX":
      return 0.006;
    case "Bond":
      return 0.015;
    case "Index":
      return 0.011;
    default:
      return 0.018;
  }
}

/**
 * Build a live quote. `t` (epoch ms) drives intraday drift so
 * successive polls move the price; the daily open/close are
 * seeded so % change is coherent within a session.
 */
export function makeQuote(inst: Instrument, t = Date.now()): Quote {
  const rng = seeded(inst.symbol, "quote-day-" + Math.floor(t / 86_400_000));
  const vol = classVol(inst.assetClass);

  // Session open drifts a little from base.
  const open = inst.basePrice * (1 + (rng() - 0.5) * vol * 0.8);
  const prevClose = inst.basePrice * (1 + (rng() - 0.5) * vol * 0.6);

  // Intraday sinusoid + fine noise keyed on the minute for smooth motion.
  const minute = Math.floor(t / 15_000); // updates ~every 15s
  const noise = mulberry32(hashString(inst.symbol) + minute)();
  const wave = Math.sin(t / 900_000 + hashString(inst.symbol) % 100) * vol * 0.5;
  const last = open * (1 + wave + (noise - 0.5) * vol * 0.4);

  const change = last - prevClose;
  const changePct = (change / prevClose) * 100;

  const spread = last * (inst.assetClass === "FX" ? 0.00008 : 0.0006);
  const bid = last - spread / 2;
  const ask = last + spread / 2;

  const dayHigh = Math.max(open, last) * (1 + rng() * vol * 0.5);
  const dayLow = Math.min(open, last) * (1 - rng() * vol * 0.5);

  const volume =
    inst.assetClass === "FX"
      ? Math.floor(rng() * 900_000_000 + 100_000_000)
      : Math.floor(rng() * 40_000_000 + 500_000);

  return {
    symbol: inst.symbol,
    name: inst.name,
    assetClass: inst.assetClass,
    currency: inst.currency,
    last,
    bid,
    ask,
    change,
    changePct,
    high: dayHigh,
    low: dayLow,
    open,
    prevClose,
    volume,
    tick: change > 0 ? "up" : change < 0 ? "down" : "flat",
    updated: t,
  };
}

export function allQuotes(t = Date.now()): Quote[] {
  return UNIVERSE.map((i) => makeQuote(i, t));
}

// ---------- Candles ----------
const TF_CONFIG: Record<Timeframe, { bars: number; stepSec: number }> = {
  "1D": { bars: 78, stepSec: 5 * 60 }, // 5-min bars, ~1 session
  "1W": { bars: 84, stepSec: 60 * 60 }, // hourly
  "1M": { bars: 30, stepSec: 24 * 60 * 60 },
  "1Y": { bars: 252, stepSec: 24 * 60 * 60 },
  "5Y": { bars: 260, stepSec: 7 * 24 * 60 * 60 }, // weekly
  MAX: { bars: 240, stepSec: 30 * 24 * 60 * 60 }, // monthly
};

export function makeCandles(symbol: string, tf: Timeframe): Candle[] {
  const inst = findInstrument(symbol);
  const base = inst?.basePrice ?? 100;
  const vol = classVol(inst?.assetClass ?? "Equity");
  const { bars, stepSec } = TF_CONFIG[tf];
  const rng = seeded(symbol, "candles-" + tf);

  const nowSec = Math.floor(Date.now() / 1000);
  // Start price so the walk lands near base at the end (mild mean reversion).
  let price = base * (1 - vol * 4 * (rng() - 0.5));
  const out: Candle[] = [];
  const barSigma = vol * (stepSec >= 86_400 ? 1 : 0.35);

  for (let i = bars - 1; i >= 0; i--) {
    const time = nowSec - i * stepSec;
    const drift = (base - price) * 0.02; // gentle pull toward base
    const shock = (rng() - 0.5) * 2 * barSigma * price;
    const open = price;
    const close = Math.max(0.0001, open + drift + shock);
    const hi = Math.max(open, close) * (1 + rng() * barSigma * 0.8);
    const lo = Math.min(open, close) * (1 - rng() * barSigma * 0.8);
    const volume = Math.floor(rng() * 8_000_000 + 200_000);
    out.push({
      time,
      open: round(open),
      high: round(hi),
      low: round(lo),
      close: round(close),
      volume,
    });
    price = close;
  }
  return out;
}

function round(n: number): number {
  if (n >= 1000) return Math.round(n * 100) / 100;
  if (n >= 1) return Math.round(n * 1000) / 1000;
  return Math.round(n * 100000) / 100000;
}

// ---------- News ----------
const HEADLINE_TEMPLATES: {
  category: NewsItem["category"];
  sources: string[];
  templates: string[];
}[] = [
  {
    category: "CentralBank",
    sources: ["Reuters", "Bloomberg", "Dow Jones"],
    templates: [
      "Fed officials signal caution on timing of next rate move",
      "ECB minutes show divided views on inflation path",
      "BoJ leaves policy unchanged, flags yen volatility",
      "Treasury yields ease as traders trim rate-cut bets",
    ],
  },
  {
    category: "Macro",
    sources: ["Reuters", "AP", "FT"],
    templates: [
      "US payrolls beat forecasts, jobless rate steady",
      "CPI print cools, core inflation edges lower",
      "Manufacturing PMI slips back into contraction",
      "Retail sales surprise to the upside in latest read",
    ],
  },
  {
    category: "Equity",
    sources: ["CNBC", "Bloomberg", "MarketWatch"],
    templates: [
      "{TICKER} rallies after upbeat guidance",
      "{TICKER} slides as margins disappoint the Street",
      "Analysts lift {TICKER} target on demand strength",
      "{TICKER} unveils buyback, shares tick higher",
    ],
  },
  {
    category: "Crypto",
    sources: ["CoinDesk", "The Block", "Bloomberg"],
    templates: [
      "{TICKER} extends gains as ETF flows accelerate",
      "{TICKER} pulls back after testing resistance",
      "On-chain data shows accumulation in {TICKER}",
    ],
  },
  {
    category: "Commodity",
    sources: ["Reuters", "Platts", "Bloomberg"],
    templates: [
      "Crude firms on tighter supply outlook",
      "Gold holds near record as haven demand persists",
      "Nat gas whipsaws on shifting weather models",
    ],
  },
  {
    category: "FX",
    sources: ["Reuters", "Bloomberg"],
    templates: [
      "Dollar steadies as yields find a floor",
      "Yen slips past key level, intervention watch grows",
      "Euro firms after hawkish ECB commentary",
    ],
  },
];

const EQUITY_SYMS = instrumentsByClass("Equity").map((i) => i.symbol);
const CRYPTO_SYMS = instrumentsByClass("Crypto").map((i) => i.symbol);

export function makeNews(count = 40, seed = Math.floor(Date.now() / 60000)): NewsItem[] {
  const rng = mulberry32(seed);
  const out: NewsItem[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const group = HEADLINE_TEMPLATES[Math.floor(rng() * HEADLINE_TEMPLATES.length)];
    let headline = group.templates[Math.floor(rng() * group.templates.length)];
    const tickers: string[] = [];

    if (headline.includes("{TICKER}")) {
      const pool = group.category === "Crypto" ? CRYPTO_SYMS : EQUITY_SYMS;
      const tk = pool[Math.floor(rng() * pool.length)];
      headline = headline.replace(/\{TICKER\}/g, tk);
      tickers.push(tk);
    }

    // Sentiment inferred from keywords + jitter.
    const bullish = /(rall|gain|beat|lift|upside|firm|buyback|higher|accel|record)/i.test(headline);
    const bearish = /(slide|slip|disappoint|pull ?back|contraction|slips)/i.test(headline);
    let score = bullish ? 0.35 + rng() * 0.5 : bearish ? -0.35 - rng() * 0.5 : (rng() - 0.5) * 0.4;
    score = Math.max(-1, Math.min(1, score));
    const sentiment: Sentiment = score > 0.15 ? "Bullish" : score < -0.15 ? "Bearish" : "Neutral";

    out.push({
      id: `n${seed}-${i}`,
      headline,
      source: group.sources[Math.floor(rng() * group.sources.length)],
      category: group.category,
      tickers,
      sentiment,
      score: Math.round(score * 100) / 100,
      time: now - Math.floor(rng() * 6 * 60 * 60 * 1000),
      body:
        "Full story on the wire. Market participants are weighing the read-through for " +
        "positioning into the next session. This is simulated newsroom copy generated by the " +
        "terminal's mock feed for demonstration purposes.",
    });
  }
  return out.sort((a, b) => b.time - a.time);
}

// ---------- Economic calendar ----------
const ECO_EVENTS = [
  { country: "US", event: "CPI YoY", importance: "High" as const, unit: "%" },
  { country: "US", event: "Non-Farm Payrolls", importance: "High" as const, unit: "K" },
  { country: "US", event: "Fed Rate Decision", importance: "High" as const, unit: "%" },
  { country: "US", event: "GDP QoQ (Adv)", importance: "High" as const, unit: "%" },
  { country: "US", event: "Initial Jobless Claims", importance: "Medium" as const, unit: "K" },
  { country: "US", event: "Retail Sales MoM", importance: "Medium" as const, unit: "%" },
  { country: "US", event: "10Y Note Auction", importance: "Medium" as const, unit: "%" },
  { country: "EU", event: "ECB Rate Decision", importance: "High" as const, unit: "%" },
  { country: "EU", event: "HICP Flash YoY", importance: "High" as const, unit: "%" },
  { country: "UK", event: "BoE Rate Decision", importance: "High" as const, unit: "%" },
  { country: "JP", event: "BoJ Policy Rate", importance: "High" as const, unit: "%" },
  { country: "CN", event: "Manufacturing PMI", importance: "Medium" as const, unit: "" },
];

export function makeEconCalendar(): EconEvent[] {
  const rng = mulberry32(hashString("eco-" + new Date().toDateString()));
  const now = Date.now();
  const out: EconEvent[] = [];

  ECO_EVENTS.forEach((e, idx) => {
    // Spread events across -1 day to +5 days.
    const offsetH = Math.floor(rng() * 144) - 24;
    const time = now + offsetH * 60 * 60 * 1000;
    const forecastN = round(rng() * 5 + (e.unit === "K" ? 150 : 1));
    const previousN = round(forecastN * (0.9 + rng() * 0.2));
    const released = time < now;
    const actualN = released ? round(forecastN * (0.85 + rng() * 0.3)) : null;
    const suffix = e.unit;
    out.push({
      id: `eco-${idx}`,
      time,
      country: e.country,
      event: e.event,
      importance: e.importance,
      forecast: `${forecastN}${suffix}`,
      previous: `${previousN}${suffix}`,
      actual: actualN === null ? null : `${actualN}${suffix}`,
    });
  });

  return out.sort((a, b) => a.time - b.time);
}

// ---------- Yield curve ----------
const TENORS: { tenor: string; months: number }[] = [
  { tenor: "1M", months: 1 },
  { tenor: "3M", months: 3 },
  { tenor: "6M", months: 6 },
  { tenor: "1Y", months: 12 },
  { tenor: "2Y", months: 24 },
  { tenor: "3Y", months: 36 },
  { tenor: "5Y", months: 60 },
  { tenor: "7Y", months: 84 },
  { tenor: "10Y", months: 120 },
  { tenor: "20Y", months: 240 },
  { tenor: "30Y", months: 360 },
];

export function makeYieldCurve(): YieldPoint[] {
  const rng = mulberry32(hashString("ycrv-" + new Date().toDateString()));
  // Mildly inverted front end, upward long end — realistic recent shape.
  return TENORS.map(({ tenor, months }) => {
    const x = months / 360;
    const base = 5.3 - 1.4 * Math.exp(-x * 3) - 0.8 * x + 0.6 * x * x;
    const y = round(base + (rng() - 0.5) * 0.08);
    const changeBp = Math.round((rng() - 0.5) * 12);
    return { tenor, months, yield: y, changeBp };
  });
}

// ---------- Options chain ----------
export function makeOptionsChain(symbol: string): OptionsChain {
  const inst = findInstrument(symbol);
  const spotQuote = inst ? makeQuote(inst) : null;
  const spot = spotQuote?.last ?? 100;
  const rng = seeded(symbol, "opt-" + new Date().toDateString());

  const step = niceStep(spot);
  const atm = Math.round(spot / step) * step;
  const rows: OptionRow[] = [];

  for (let k = -6; k <= 6; k++) {
    const strike = round(atm + k * step);
    if (strike <= 0) continue;
    const moneyness = (strike - spot) / spot;
    // IV smile.
    const baseIv = 22 + Math.abs(moneyness) * 120 + rng() * 4;
    const callIntrinsic = Math.max(0, spot - strike);
    const putIntrinsic = Math.max(0, strike - spot);
    const timeVal = spot * (baseIv / 100) * 0.12;
    const callMid = callIntrinsic + timeVal * (1 - Math.max(0, moneyness));
    const putMid = putIntrinsic + timeVal * (1 + Math.min(0, moneyness));
    const sp = Math.max(0.05, spot * 0.001);

    rows.push({
      strike,
      callBid: round(Math.max(0.01, callMid - sp)),
      callAsk: round(callMid + sp),
      callIv: round(baseIv),
      callOi: Math.floor(rng() * 12000),
      callVol: Math.floor(rng() * 3000),
      putBid: round(Math.max(0.01, putMid - sp)),
      putAsk: round(putMid + sp),
      putIv: round(baseIv + rng() * 2),
      putOi: Math.floor(rng() * 12000),
      putVol: Math.floor(rng() * 3000),
    });
  }

  const expiry = nextThirdFriday();
  return { symbol: symbol.toUpperCase(), spot: round(spot), expiry, rows };
}

function niceStep(spot: number): number {
  if (spot >= 1000) return 50;
  if (spot >= 200) return 10;
  if (spot >= 50) return 5;
  if (spot >= 10) return 1;
  if (spot >= 1) return 0.5;
  return 0.05;
}

function nextThirdFriday(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  let fridays = 0;
  while (fridays < 3) {
    if (d.getDay() === 5) fridays++;
    if (fridays < 3) d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

// ---------- Fundamentals ----------
export function makeFundamentals(symbol: string): Fundamentals {
  const inst = findInstrument(symbol);
  const name = inst?.name ?? symbol;
  const sector = inst?.sector ?? "—";
  const rng = seeded(symbol, "fund");
  const q = inst ? makeQuote(inst) : null;
  const price = q?.last ?? 100;

  const eps = round(price / (12 + rng() * 25));
  const peRatio = round(price / Math.max(0.01, eps));
  const shares = Math.floor(rng() * 4_000 + 400); // millions
  const marketCap = Math.round(price * shares); // $M

  const years = ["2024", "2023", "2022", "2021"];
  const rev0 = Math.round(marketCap * (0.4 + rng() * 0.6));
  const growth = 0.06 + rng() * 0.12;

  const series = (start: number, g: number, jitter: number) =>
    years.map((_, i) => Math.round(start / Math.pow(1 + g, i) * (1 + (rng() - 0.5) * jitter)));

  const revenue = series(rev0, growth, 0.05);
  const grossProfit = revenue.map((r) => Math.round(r * (0.5 + rng() * 0.15)));
  const opInc = revenue.map((r) => Math.round(r * (0.18 + rng() * 0.12)));
  const netInc = revenue.map((r) => Math.round(r * (0.12 + rng() * 0.1)));

  const assets = series(rev0 * 1.8, growth * 0.6, 0.04);
  const liabilities = assets.map((a) => Math.round(a * (0.45 + rng() * 0.2)));
  const equity = assets.map((a, i) => a - liabilities[i]);

  const opCf = netInc.map((n) => Math.round(n * (1.2 + rng() * 0.3)));
  const capex = revenue.map((r) => -Math.round(r * (0.05 + rng() * 0.05)));
  const fcf = opCf.map((c, i) => c + capex[i]);

  return {
    symbol: symbol.toUpperCase(),
    name,
    sector,
    description:
      `${name} operates in the ${sector} sector. This description and the accompanying ` +
      `financial statements are generated by the terminal's mock fundamentals engine for ` +
      `demonstration. Wire real filings via the provider layer (Alpha Vantage / openFDA / SEC).`,
    marketCap,
    peRatio,
    eps,
    evEbitda: round(peRatio * (0.6 + rng() * 0.3)),
    dividendYield: round(rng() * 3),
    beta: round(0.6 + rng() * 1.2),
    week52High: round(price * (1.05 + rng() * 0.3)),
    week52Low: round(price * (0.6 + rng() * 0.25)),
    income: [
      { label: "Revenue", values: revenue },
      { label: "Gross Profit", values: grossProfit },
      { label: "Operating Income", values: opInc },
      { label: "Net Income", values: netInc },
    ],
    balance: [
      { label: "Total Assets", values: assets },
      { label: "Total Liabilities", values: liabilities },
      { label: "Total Equity", values: equity },
    ],
    cashflow: [
      { label: "Operating Cash Flow", values: opCf },
      { label: "CapEx", values: capex },
      { label: "Free Cash Flow", values: fcf },
    ],
  };
}

export const FUNDAMENTALS_YEARS = ["2024", "2023", "2022", "2021"];
