// ============================================================
//  /api/yields — live US Treasury yield curve
//    • FRED_API_KEY set → full constant-maturity curve (1M–30Y)
//                         from the Federal Reserve (official source)
//    • otherwise        → Yahoo CBOE proxy indices (4 tenors only)
// ============================================================

import { NextResponse } from "next/server";
import type { YieldPoint } from "@/types";
import { yfQuotes } from "@/lib/yahoo";
import { isFredEnabled, fredCurve } from "@/lib/fred";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TENORS: { yahoo: string; tenor: string; months: number }[] = [
  { yahoo: "^IRX", tenor: "13W", months: 3 },
  { yahoo: "^FVX", tenor: "5Y", months: 60 },
  { yahoo: "^TNX", tenor: "10Y", months: 120 },
  { yahoo: "^TYX", tenor: "30Y", months: 360 },
];

const num = (v: unknown): number | null =>
  typeof v === "number" && isFinite(v) ? v : null;

async function yahooCurve(): Promise<YieldPoint[]> {
  const quotes = await yfQuotes(TENORS.map((t) => t.yahoo));
  const bySym = new Map(quotes.map((q) => [q.symbol, q]));
  const curve: YieldPoint[] = [];
  for (const t of TENORS) {
    const q = bySym.get(t.yahoo);
    const y = num(q?.regularMarketPrice);
    if (y == null) continue;
    const changeBp = Math.round((num(q?.regularMarketChange) ?? 0) * 100);
    curve.push({ tenor: t.tenor, months: t.months, yield: y, changeBp });
  }
  return curve;
}

export async function GET() {
  try {
    let curve: YieldPoint[] = [];
    let source = "yahoo";

    // 1) FRED (full official curve)
    if (isFredEnabled()) {
      try {
        curve = await fredCurve();
        if (curve.length > 0) source = "fred";
      } catch {
        /* fall through to Yahoo */
      }
    }

    // 2) Yahoo fallback (partial proxy curve)
    if (curve.length === 0) {
      curve = await yahooCurve();
      source = "yahoo";
    }

    const error = curve.length === 0 ? "Treasury yield data is currently unavailable." : null;
    return NextResponse.json(
      { data: curve, error, source, ts: Date.now() },
      { status: error ? 502 : 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "yields fetch failed";
    return NextResponse.json({ data: [], error: msg, source: "yahoo", ts: Date.now() }, { status: 502 });
  }
}
