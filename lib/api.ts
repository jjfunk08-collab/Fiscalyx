// ============================================================
//  DATA ACCESS LAYER (client-side)
//  Thin fetchers over the live Route Handlers. There is NO mock
//  fallback — every function returns an explicit error / notFound
//  flag so the UI can render a truthful "No Data" / "Not Found"
//  state instead of fabricated numbers.
// ============================================================

import type {
  Candle,
  Fundamentals,
  NewsItem,
  OptionsChain,
  Quote,
  Timeframe,
  YieldPoint,
} from "@/types";

export interface MarketResult {
  quotes: Quote[];
  notFound: string[];
  error: string | null;
  source?: string;
}
export interface HistoryResult {
  candles: Candle[];
  notFound: boolean;
  error: string | null;
}
export interface NewsResult {
  items: NewsItem[];
  error: string | null;
}
export interface FundamentalsResult {
  available: boolean;
  fundamentals?: Fundamentals;
  years?: string[];
  reason?: string;
  error: string | null;
}
export interface OptionsResult {
  available: boolean;
  chain?: OptionsChain;
  reason?: string;
  error: string | null;
}
export interface YieldsResult {
  curve: YieldPoint[];
  error: string | null;
  source?: string;
}
export interface EconEventItem {
  name: string;
  date: string;
}
export interface CalendarResult {
  events: EconEventItem[];
  error: string | null;
  source?: string;
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { cache: "no-store" });
  // Route handlers return a JSON body even on 5xx; parse regardless.
  const body = await res.json().catch(() => ({}));
  return body;
}

export async function getQuotes(symbols?: string[]): Promise<MarketResult> {
  const qs = symbols && symbols.length ? `?symbols=${encodeURIComponent(symbols.join(","))}` : "";
  try {
    const b = await getJson(`/api/market${qs}`);
    return {
      quotes: Array.isArray(b.data) ? (b.data as Quote[]) : [],
      notFound: Array.isArray(b.notFound) ? b.notFound : [],
      error: b.error ?? null,
      source: typeof b.source === "string" ? b.source : undefined,
    };
  } catch {
    return { quotes: [], notFound: [], error: "Unable to reach the market data service." };
  }
}

export async function getHistory(symbol: string, tf: Timeframe): Promise<HistoryResult> {
  try {
    const b = await getJson(`/api/history?symbol=${encodeURIComponent(symbol)}&tf=${tf}`);
    return {
      candles: Array.isArray(b.data) ? (b.data as Candle[]) : [],
      notFound: Boolean(b.notFound),
      error: b.error ?? null,
    };
  } catch {
    return { candles: [], notFound: false, error: "Unable to reach the history service." };
  }
}

export async function getNews(query?: string): Promise<NewsResult> {
  const qs = query ? `?q=${encodeURIComponent(query)}` : "";
  try {
    const b = await getJson(`/api/news${qs}`);
    return { items: Array.isArray(b.data) ? (b.data as NewsItem[]) : [], error: b.error ?? null };
  } catch {
    return { items: [], error: "Unable to reach the news service." };
  }
}

export async function getFundamentals(symbol: string): Promise<FundamentalsResult> {
  try {
    const b = await getJson(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`);
    return {
      available: Boolean(b.available),
      fundamentals: b.fundamentals,
      years: b.years,
      reason: b.reason,
      error: null,
    };
  } catch {
    return { available: false, error: "Unable to reach the fundamentals service." };
  }
}

export async function getOptions(symbol: string): Promise<OptionsResult> {
  try {
    const b = await getJson(`/api/options?symbol=${encodeURIComponent(symbol)}`);
    return { available: Boolean(b.available), chain: b.chain, reason: b.reason, error: null };
  } catch {
    return { available: false, error: "Unable to reach the options service." };
  }
}

export async function getYields(): Promise<YieldsResult> {
  try {
    const b = await getJson(`/api/yields`);
    return {
      curve: Array.isArray(b.data) ? (b.data as YieldPoint[]) : [],
      error: b.error ?? null,
      source: typeof b.source === "string" ? b.source : undefined,
    };
  } catch {
    return { curve: [], error: "Unable to reach the yields service." };
  }
}

export async function getCalendar(): Promise<CalendarResult> {
  try {
    const b = await getJson(`/api/calendar`);
    return {
      events: Array.isArray(b.data) ? (b.data as EconEventItem[]) : [],
      error: b.error ?? null,
      source: typeof b.source === "string" ? b.source : undefined,
    };
  } catch {
    return { events: [], error: "Unable to reach the calendar service." };
  }
}
export function toQuoteMap(quotes: Quote[]): Record<string, Quote> {
  const m: Record<string, Quote> = {};
  for (const q of quotes) m[q.symbol] = q;
  return m;
}
