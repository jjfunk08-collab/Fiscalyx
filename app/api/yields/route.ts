// ============================================================
//  /api/yields — live US Treasury yields (partial curve)
//  Source: Yahoo CBOE yield indices (^IRX 13w, ^FVX 5y,
//  ^TNX 10y, ^TYX 30y). These are the zero-key tenors Yahoo
//  exposes; a full 1M–30Y curve needs a FRED/Treasury key.
// ============================================================

import { NextResponse } from "next/server";
import type { YieldPoint } from "@/types";
import { yfQuotes } from "@/lib/yahoo";

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

export async function GET() {
  try {
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

    const error = curve.length === 0 ? "Treasury yield data is currently unavailable." : null;
    return NextResponse.json(
      { data: curve, error, source: "live", ts: Date.now() },
      { status: error ? 502 : 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "yields fetch failed";
    return NextResponse.json({ data: [], error: msg, source: "live", ts: Date.now() }, { status: 502 });
  }
}
