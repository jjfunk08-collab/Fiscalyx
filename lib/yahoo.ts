// ============================================================
//  Yahoo Finance access (via the `yahoo-finance2` library)
//  Server-only: import this exclusively from Route Handlers.
//
//  yahoo-finance2 uses Yahoo's public (unofficial) endpoints and
//  requires no API key. We relax schema validation so Yahoo adding
//  or renaming fields never hard-fails a request, and suppress the
//  library's console notices.
//
//  Calls into the library are cast at the boundary so the app
//  compiles cleanly across yahoo-finance2 minor versions; our own
//  typed wrappers describe exactly what the rest of the app relies on.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import yahooFinance from "yahoo-finance2";

const yf = yahooFinance as any;

// Silence the library's first-run survey / deprecation notices.
try {
  yf.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
} catch {
  /* older/newer versions may not expose this — safe to ignore */
}

// Relaxed module options: don't throw if Yahoo's payload drifts.
const RELAXED = { validateResult: false };

export interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  bid?: number;
  ask?: number;
  marketCap?: number;
  trailingPE?: number;
  shortName?: string;
  longName?: string;
  currency?: string;
}

/**
 * Batch quote, hardened against a single bad ticker taking down the whole
 * call. yahoo-finance2's multi-symbol quote() can reject the ENTIRE batch
 * if Yahoo errors on any one symbol in it — so we first try the batch call
 * (fast path), and if that throws, we retry per-symbol so the rest of the
 * feed still comes back instead of going empty.
 */
export async function yfQuotes(symbols: string[]): Promise<YahooQuote[]> {
  if (symbols.length === 0) return [];

  try {
    const out = await yf.quote(symbols, {}, RELAXED);
    const arr = Array.isArray(out) ? out : [out];
    return arr as YahooQuote[];
  } catch {
    // Batch call failed — fall back to per-symbol requests so one bad
    // ticker doesn't zero out the whole quote set.
    const results = await Promise.allSettled(
      symbols.map((s) => yf.quote(s, {}, RELAXED))
    );
    const out: YahooQuote[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        const v = Array.isArray(r.value) ? r.value : [r.value];
        out.push(...(v as YahooQuote[]));
      }
    }
    return out;
  }
}

export interface YahooCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Short in-memory cache so repeated polls (esp. the 10s intraday chart
// refresh) don't re-hit Yahoo every single time — this is what actually
// matters for avoiding 429s from Vercel's IP, not just a speed win.
const chartCache = new Map<string, { ts: number; value: YahooCandle[] }>();

function cacheTtlFor(interval: string): number {
  // Intraday intervals refresh often, so cache briefly; daily+ can sit longer.
  if (interval === "5m" || interval === "60m") return 20_000;
  return 5 * 60_000;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function chartOnce(
  symbol: string,
  opts: { period1: Date; period2?: Date; interval: string }
): Promise<YahooCandle[]> {
  const result = await yf.chart(
    symbol,
    { period1: opts.period1, period2: opts.period2, interval: opts.interval },
    RELAXED
  );
  const quotes = (result?.quotes || []) as Array<any>;
  const out: YahooCandle[] = [];
  for (const q of quotes) {
    if (q == null || q.close == null || q.open == null) continue;
    out.push({
      time: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open,
      high: q.high ?? q.open,
      low: q.low ?? q.open,
      close: q.close,
      volume: q.volume ?? 0,
    });
  }
  return out;
}

/**
 * Historical/intraday candles via chart(), hardened against Yahoo's
 * rate-limiting of cloud/datacenter IPs (common on Vercel):
 *   - short TTL cache absorbs repeated polls for the same symbol/interval
 *   - one retry with a short backoff before surfacing the error, since a
 *     429 is often transient rather than a sustained block.
 */
export async function yfChart(
  symbol: string,
  opts: { period1: Date; period2?: Date; interval: string }
): Promise<YahooCandle[]> {
  const key = `${symbol}|${opts.interval}|${opts.period1.toISOString().slice(0, 10)}`;
  const ttl = cacheTtlFor(opts.interval);
  const hit = chartCache.get(key);
  const now = Date.now();
  if (hit && now - hit.ts < ttl) return hit.value;

  try {
    const value = await chartOnce(symbol, opts);
    chartCache.set(key, { ts: now, value });
    return value;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isRateLimited = /429|Too Many Requests/i.test(msg);
    if (isRateLimited) {
      await sleep(700);
      try {
        const value = await chartOnce(symbol, opts);
        chartCache.set(key, { ts: now, value });
        return value;
      } catch {
        // Serve a stale cached value rather than a hard failure, if we have one.
        if (hit) return hit.value;
        throw new Error("Yahoo Finance is rate-limiting chart requests right now.");
      }
    }
    if (hit) return hit.value;
    throw e;
  }
}

export interface YahooNews {
  uuid?: string;
  title: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: Date | number | string;
  relatedTickers?: string[];
}

/** Financial news + symbol matches for a query. */
export async function yfSearchNews(query: string, count = 20): Promise<YahooNews[]> {
  const res = await yf.search(
    query,
    { newsCount: count, quotesCount: 0, enableFuzzyQuery: false },
    RELAXED
  );
  return (res?.news || []) as YahooNews[];
}

/** Full quoteSummary bundle for fundamentals. Returns the raw object (guard fields at the call site). */
export async function yfQuoteSummary(symbol: string): Promise<Record<string, unknown>> {
  const res = await yf.quoteSummary(
    symbol,
    {
      modules: [
        "price",
        "summaryDetail",
        "defaultKeyStatistics",
        "assetProfile",
        "incomeStatementHistory",
        "balanceSheetHistory",
        "cashflowStatementHistory",
      ],
    },
    RELAXED
  );
  return (res || {}) as Record<string, unknown>;
}

/** Options chain (nearest expiry) for a symbol. */
export async function yfOptions(symbol: string): Promise<Record<string, unknown>> {
  const res = await yf.options(symbol, {}, RELAXED);
  return (res || {}) as Record<string, unknown>;
}
