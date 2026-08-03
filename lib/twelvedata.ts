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
