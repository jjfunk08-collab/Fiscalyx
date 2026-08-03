// ============================================================
//  Twelve Data (https://api.twelvedata.com)  — server-only
//
//  Enabled by setting TWELVEDATA_API_KEY. When enabled, this is the
//  primary source for CHART CANDLES (equities, FX, indices, metals) —
//  a real keyed API instead of Yahoo's unofficial, IP-throttled feed.
//
//  Free tier: ~800 API credits/day, ~8 requests/min. Each symbol's
//  time_series call is one credit, so responses are cached here (charts
//  are on-demand per symbol/timeframe, not polled for the whole grid).
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Candle } from "@/types";

const BASE = "https://api.twelvedata.com";

export function twelveDataKey(): string | null {
  const k = process.env.TWELVEDATA_API_KEY;
  return k && k.trim() ? k.trim() : null;
}
export function isTwelveDataEnabled(): boolean {
  return twelveDataKey() !== null;
}

interface CacheEntry {
  ts: number;
  value: Candle[];
}
const cache = new Map<string, CacheEntry>();

function parseTs(datetime: string): number {
  // Twelve Data returns "YYYY-MM-DD" (daily+) or "YYYY-MM-DD HH:mm:ss" (intraday).
  // Treat as UTC for charting; minor exchange-tz drift is acceptable for a PoC.
  const iso = datetime.includes(" ") ? datetime.replace(" ", "T") + "Z" : datetime + "T00:00:00Z";
  const t = Date.parse(iso);
  return isNaN(t) ? 0 : Math.floor(t / 1000);
}

/**
 * Fetch OHLCV candles for a Twelve Data symbol.
 * Returns [] (not throwing) when the symbol/interval isn't available on the
 * current plan, so the caller can fall back to another provider cleanly.
 */
export async function tdTimeSeries(
  symbol: string,
  interval: string,
  outputsize: number,
  ttlMs: number
): Promise<Candle[]> {
  const key = twelveDataKey();
  if (!key) return [];

  const cacheKey = `${symbol}|${interval}|${outputsize}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.ts < ttlMs) return hit.value;

  const url =
    `${BASE}/time_series?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${encodeURIComponent(interval)}&outputsize=${outputsize}` +
    `&order=ASC&apikey=${encodeURIComponent(key)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    // 429 rate-limit or other HTTP error → let caller fall back.
    return [];
  }
  const body: any = await res.json().catch(() => null);

  // Twelve Data signals errors with { status: "error", code, message }.
  if (!body || body.status === "error" || !Array.isArray(body.values)) {
    return [];
  }

  const candles: Candle[] = body.values
    .map((v: any) => ({
      time: parseTs(String(v.datetime)),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: v.volume != null && v.volume !== "" ? Number(v.volume) : 0,
    }))
    .filter(
      (c: Candle) =>
        c.time > 0 && isFinite(c.open) && isFinite(c.close) && isFinite(c.high) && isFinite(c.low)
    )
    // order=ASC should already sort, but guarantee ascending time for the chart.
    .sort((a: Candle, b: Candle) => a.time - b.time);

  cache.set(cacheKey, { ts: now, value: candles });
  return candles;
}

interface QuoteCacheEntry {
  ts: number;
  key: string;
  value: Map<string, TdQuote>;
}
let quoteCache: QuoteCacheEntry | null = null;
// Grid quotes are polled continuously and Twelve Data bills PER SYMBOL, so
// this cache is deliberately long (60s). Index/FX/commodity quotes don't need
// sub-minute freshness here, and this keeps the ~800/day free budget from
// being exhausted in minutes. Heavy 24/7 use will still hit the cap, at which
// point the market route falls back to Yahoo for these rows.
const QUOTE_TTL = 60_000;

export interface TdQuote {
  symbol: string;
  close: number;
  previous_close: number | null;
  change: number | null;
  percent_change: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  volume: number | null;
  currency?: string;
  name?: string;
}

/**
 * Batched real-time quote for indices/FX/commodities — one HTTP call for
 * every symbol requested (Twelve Data accepts a comma-separated list),
 * with a short shared cache so repeated polls don't burn through the
 * ~800 calls/day free budget.
 */
export async function tdQuotes(symbols: string[]): Promise<Map<string, TdQuote>> {
  const key = twelveDataKey();
  if (!key || symbols.length === 0) return new Map();

  // Cache is keyed by the REQUESTED symbol set (sorted), not by which symbols
  // resolved — otherwise any symbol Twelve Data can't price (never in the map)
  // would force a fresh call on every poll and exhaust the daily budget.
  const setKey = [...symbols].sort().join(",");
  const now = Date.now();
  if (quoteCache && quoteCache.key === setKey && now - quoteCache.ts < QUOTE_TTL) {
    return quoteCache.value;
  }

  const url = `${BASE}/quote?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    // Rate-limited (429) / bad key / outage — back off for the TTL window so
    // we don't re-hit Twelve Data every poll; grid falls back to Yahoo.
    const empty = new Map<string, TdQuote>();
    quoteCache = { ts: now, key: setKey, value: empty };
    return empty;
  }
  const body: any = await res.json().catch(() => null);
  if (!body || body.status === "error") {
    const empty = new Map<string, TdQuote>();
    quoteCache = { ts: now, key: setKey, value: empty };
    return empty;
  }

  // Single-symbol requests return one object; multi-symbol returns
  // { "SYMBOL": {...} } keyed by symbol.
  const out = new Map<string, TdQuote>();
  const entries: [string, any][] =
    symbols.length === 1 ? [[symbols[0], body]] : Object.entries(body);

  for (const [sym, v] of entries) {
    if (!v || v.status === "error" || v.close == null) continue;
    out.set(sym, {
      symbol: sym,
      close: Number(v.close),
      previous_close: v.previous_close != null ? Number(v.previous_close) : null,
      change: v.change != null ? Number(v.change) : null,
      percent_change: v.percent_change != null ? Number(v.percent_change) : null,
      high: v.high != null ? Number(v.high) : null,
      low: v.low != null ? Number(v.low) : null,
      open: v.open != null ? Number(v.open) : null,
      volume: v.volume != null && v.volume !== "" ? Number(v.volume) : null,
      currency: v.currency,
      name: v.name,
    });
  }

  quoteCache = { ts: now, key: setKey, value: out };
  return out;
}
