// ============================================================
//  Finnhub access (https://finnhub.io/api/v1)  — server-only
//
//  Enabled by setting FINNHUB_API_KEY. When enabled, Finnhub is the
//  primary provider for US-equity QUOTES, NEWS, and FUNDAMENTALS.
//
//  NOTE on candles: Finnhub moved historical candles (/stock/candle)
//  to PAID tiers — a free key returns HTTP 403. So chart history stays
//  on Yahoo unless you explicitly opt in with FINNHUB_ENABLE_CANDLES=true
//  (only useful once you're on a paid Finnhub plan).
//
//  Free tier is ~60 req/min, so responses are cached briefly here and
//  the client poll interval is widened accordingly.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
const BASE = "https://finnhub.io/api/v1";

export function finnhubKey(): string | null {
  const k = process.env.FINNHUB_API_KEY;
  return k && k.trim() ? k.trim() : null;
}
export function isFinnhubEnabled(): boolean {
  return finnhubKey() !== null;
}
export function finnhubCandlesEnabled(): boolean {
  return isFinnhubEnabled() && process.env.FINNHUB_ENABLE_CANDLES === "true";
}

interface CacheEntry {
  ts: number;
  value: unknown;
}
const cache = new Map<string, CacheEntry>();

async function fhFetch<T>(path: string, ttlMs: number): Promise<T> {
  const key = finnhubKey();
  if (!key) throw new Error("FINNHUB_API_KEY not set");
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}token=${encodeURIComponent(key)}`;

  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.ts < ttlMs) return hit.value as T;

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 403) {
    throw new Error("Finnhub 403: this endpoint requires a paid plan.");
  }
  if (res.status === 429) {
    throw new Error("Finnhub 429: rate limit reached.");
  }
  if (!res.ok) throw new Error(`Finnhub ${res.status} for ${path}`);
  const value = (await res.json()) as T;
  cache.set(url, { ts: now, value });
  return value;
}

export interface FhQuote {
  c: number; // current
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  t: number; // unix seconds
}

/** Real-time quote for one symbol. Returns c===0 & pc===0 for unknown tickers. */
export async function fhQuote(symbol: string): Promise<FhQuote> {
  return fhFetch<FhQuote>(`/quote?symbol=${encodeURIComponent(symbol)}`, 8_000);
}

export interface FhCandle {
  s: string; // "ok" | "no_data"
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  t: number[];
  v: number[];
}

/** Historical candles (PAID). resolution ∈ 1,5,15,30,60,D,W,M ; from/to unix seconds. */
export async function fhCandle(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<FhCandle> {
  return fhFetch<FhCandle>(
    `/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}`,
    60_000
  );
}

export interface FhNews {
  category?: string;
  datetime?: number; // unix seconds
  headline: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
}

/** Company-specific news for the last `days` days. */
export async function fhCompanyNews(symbol: string, days = 30): Promise<FhNews[]> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return fhFetch<FhNews[]>(
    `/company-news?symbol=${encodeURIComponent(symbol)}&from=${fmt(from)}&to=${fmt(to)}`,
    120_000
  );
}

/** General market news by category (general, forex, crypto, merger). */
export async function fhGeneralNews(category = "general"): Promise<FhNews[]> {
  return fhFetch<FhNews[]>(`/news?category=${encodeURIComponent(category)}`, 120_000);
}

/** Basic financial metrics (ratios, 52w range, market cap in USD millions). */
export async function fhMetric(symbol: string): Promise<any> {
  return fhFetch<any>(`/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`, 300_000);
}

/** Company profile (name, industry, exchange). */
export async function fhProfile(symbol: string): Promise<any> {
  return fhFetch<any>(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`, 3_600_000);
}

/** As-reported financial statements (SEC-sourced). */
export async function fhFinancialsReported(symbol: string): Promise<any> {
  return fhFetch<any>(
    `/stock/financials-reported?symbol=${encodeURIComponent(symbol)}`,
    3_600_000
  );
}
