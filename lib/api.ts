// ============================================================
//  DATA ACCESS LAYER (client-side)
//  Every fetch degrades gracefully to the local mock engine so
//  the UI never shows a blank/broken panel. Route handlers do
//  the real multi-provider resolution server-side.
// ============================================================

import type { Candle, NewsItem, Quote, Timeframe } from "@/types";
import {
  allQuotes,
  makeCandles,
  makeNews,
} from "@/lib/mock";

async function safeJson<T>(url: string, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { data?: T };
    if (!data || data.data == null) throw new Error("empty payload");
    return data.data;
  } catch {
    // Silent, deliberate fallback — the terminal must stay live.
    return fallback();
  }
}

export async function getQuotes(): Promise<Quote[]> {
  return safeJson<Quote[]>("/api/market", () => allQuotes());
}

export async function getHistory(symbol: string, tf: Timeframe): Promise<Candle[]> {
  return safeJson<Candle[]>(
    `/api/history?symbol=${encodeURIComponent(symbol)}&tf=${tf}`,
    () => makeCandles(symbol, tf)
  );
}

export async function getNews(): Promise<NewsItem[]> {
  return safeJson<NewsItem[]>("/api/news", () => makeNews());
}

// Convenience: derive a single quote map from the full snapshot.
export function toQuoteMap(quotes: Quote[]): Record<string, Quote> {
  const m: Record<string, Quote> = {};
  for (const q of quotes) m[q.symbol] = q;
  return m;
}
