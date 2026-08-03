// ============================================================
//  CoinGecko free public API (no key required)
//  Docs: https://api.coingecko.com/api/v3
//  A tiny in-memory TTL cache keeps us comfortably under the
//  free-tier rate limit even while the frontend polls every ~6s.
// ============================================================

const BASE = "https://api.coingecko.com/api/v3";
const DEMO_KEY = process.env.COINGECKO_API_KEY; // optional demo key → higher limits

interface CacheEntry {
  ts: number;
  value: unknown;
}
const cache = new Map<string, CacheEntry>();

async function cgFetch<T>(path: string, ttlMs: number): Promise<T> {
  const url = `${BASE}${path}`;
  const hit = cache.get(url);
  const now = Date.now();
  if (hit && now - hit.ts < ttlMs) return hit.value as T;

  const headers: Record<string, string> = { accept: "application/json" };
  if (DEMO_KEY) headers["x-cg-demo-api-key"] = DEMO_KEY;

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`CoinGecko ${res.status} for ${path}`);
  const value = (await res.json()) as T;
  cache.set(url, { ts: now, value });
  return value;
}

export interface CgMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  high_24h: number | null;
  low_24h: number | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number | null;
  market_cap: number | null;
}

/** Live market snapshot for a set of CoinGecko ids. Cached ~15s. */
export async function cgMarkets(ids: string[]): Promise<CgMarket[]> {
  if (ids.length === 0) return [];
  const idParam = encodeURIComponent(ids.join(","));
  return cgFetch<CgMarket[]>(
    `/coins/markets?vs_currency=usd&ids=${idParam}&price_change_percentage=24h&per_page=250`,
    15_000
  );
}

/**
 * OHLC candles for a coin. CoinGecko returns [ts_ms, open, high, low, close].
 * The free /ohlc endpoint does not include volume, so volume is reported as 0.
 * Cached 60s (history changes slowly relative to quotes).
 */
export async function cgOhlc(
  id: string,
  days: string
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  const raw = await cgFetch<number[][]>(
    `/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${encodeURIComponent(days)}`,
    60_000
  );
  return (raw || [])
    .filter((r) => Array.isArray(r) && r.length >= 5)
    .map((r) => ({
      time: Math.floor(r[0] / 1000),
      open: r[1],
      high: r[2],
      low: r[3],
      close: r[4],
      volume: 0,
    }));
}
