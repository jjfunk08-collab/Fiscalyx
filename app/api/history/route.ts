import { NextResponse } from "next/server";
import { makeCandles } from "@/lib/mock";
import type { Timeframe } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TF: Timeframe[] = ["1D", "1W", "1M", "1Y", "5Y", "MAX"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();
  const tfParam = (searchParams.get("tf") || "1Y").toUpperCase() as Timeframe;
  const tf: Timeframe = VALID_TF.includes(tfParam) ? tfParam : "1Y";

  // A real provider (Alpha Vantage TIME_SERIES_* / Finnhub /stock/candle)
  // would be attempted here when a key is configured; on any failure we
  // fall through to the deterministic mock series below.
  const candles = makeCandles(symbol, tf);

  return NextResponse.json({ data: candles, symbol, tf, source: "mock", ts: Date.now() });
}
