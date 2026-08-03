// ============================================================
//  FRED — Federal Reserve Economic Data (https://api.stlouisfed.org/fred)
//  Server-only. Enabled by setting FRED_API_KEY.
//
//  Official U.S. government source for the full Treasury constant-maturity
//  curve (1M–30Y), replacing Yahoo's 4-point CBOE proxy. Treasury data is
//  end-of-day, so responses are cached generously.
//
//  Attribution required by FRED terms:
//  "This product uses the FRED® API but is not endorsed or certified by
//   the Federal Reserve Bank of St. Louis."
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { YieldPoint } from "@/types";

const BASE = "https://api.stlouisfed.org/fred";

export function fredKey(): string | null {
  const k = process.env.FRED_API_KEY;
  return k && k.trim() ? k.trim() : null;
}
export function isFredEnabled(): boolean {
  return fredKey() !== null;
}

// Constant-maturity Treasury series, short → long.
const CURVE: { series: string; tenor: string; months: number }[] = [
  { series: "DGS1MO", tenor: "1M", months: 1 },
  { series: "DGS3MO", tenor: "3M", months: 3 },
  { series: "DGS6MO", tenor: "6M", months: 6 },
  { series: "DGS1", tenor: "1Y", months: 12 },
  { series: "DGS2", tenor: "2Y", months: 24 },
  { series: "DGS5", tenor: "5Y", months: 60 },
  { series: "DGS7", tenor: "7Y", months: 84 },
  { series: "DGS10", tenor: "10Y", months: 120 },
  { series: "DGS20", tenor: "20Y", months: 240 },
  { series: "DGS30", tenor: "30Y", months: 360 },
];

interface CacheEntry {
  ts: number;
  value: YieldPoint[];
}
let curveCache: CacheEntry | null = null;
const CURVE_TTL = 15 * 60_000; // treasury data is daily; 15 min is plenty

async function latestTwo(series: string, key: string): Promise<{ latest: number; prev: number | null } | null> {
  const url =
    `${BASE}/series/observations?series_id=${series}` +
    `&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=5`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const body: any = await res.json().catch(() => null);
  const obs: any[] = body?.observations ?? [];
  // FRED marks missing values with ".".
  const vals = obs
    .map((o) => (o?.value === "." || o?.value == null ? null : Number(o.value)))
    .filter((v): v is number => v != null && isFinite(v));
  if (vals.length === 0) return null;
  return { latest: vals[0], prev: vals.length > 1 ? vals[1] : null };
}

/** Build the full Treasury curve. Cached ~15 min. Returns [] on failure. */
export async function fredCurve(): Promise<YieldPoint[]> {
  const key = fredKey();
  if (!key) return [];

  const now = Date.now();
  if (curveCache && now - curveCache.ts < CURVE_TTL) return curveCache.value;

  const results = await Promise.allSettled(CURVE.map((c) => latestTwo(c.series, key)));
  const curve: YieldPoint[] = [];
  results.forEach((r, i) => {
    if (r.status !== "fulfilled" || !r.value) return;
    const { latest, prev } = r.value;
    const changeBp = prev != null ? Math.round((latest - prev) * 100) : 0;
    curve.push({ tenor: CURVE[i].tenor, months: CURVE[i].months, yield: latest, changeBp });
  });

  if (curve.length > 0) curveCache = { ts: now, value: curve };
  return curve;
}
