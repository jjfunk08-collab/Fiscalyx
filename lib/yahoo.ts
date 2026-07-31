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

/** Batch quote. Returns whatever Yahoo resolves; unknown symbols are simply absent. */
export async function yfQuotes(symbols: string[]): Promise<YahooQuote[]> {
  if (symbols.length === 0) return [];
  const out = await yf.quote(symbols, {}, RELAXED);
  const arr = Array.isArray(out) ? out : [out];
  return arr as YahooQuote[];
}

export interface YahooCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Historical/intraday candles via chart(). */
export async function yfChart(
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
