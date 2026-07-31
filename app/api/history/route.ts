// ============================================================
//  /api/history — live OHLC candles
//  Crypto → CoinGecko /ohlc ; everything else → Yahoo chart()
// ============================================================

import { NextResponse } from "next/server";
import type { Candle, Timeframe } from "@/types";
import { resolveForQuery } from "@/lib/universe";
import { cgOhlc } from "@/lib/coingecko";
import { yfChart } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TF: Timeframe[] = ["1D", "1W", "1M", "1Y", "5Y", "MAX"];
const DAY = 86_400_000;

// Yahoo interval + lookback window per timeframe.
function yahooParams(tf: Timeframe): { interval: string; period1: Date } {
  const now = Date.now();
  switch (tf) {
    case "1D":
      return { interval: "5m", period1: new Date(now - 3 * DAY) };
    case "1W":
      return { interval: "60m", period1: new Date(now - 8 * DAY) };
    case "1M":
      return { interval: "1d", period1: new Date(now - 33 * DAY) };
    case "1Y":
      return { interval: "1d", period1: new Date(now - 366 * DAY) };
    case "5Y":
      return { interval: "1wk", period1: new Date(now - 5 * 366 * DAY) };
    case "MAX":
      return { interval: "1mo", period1: new Date(now - 25 * 366 * DAY) };
  }
}

// CoinGecko /ohlc `days` window per timeframe (free tier granularity).
function cgDays(tf: Timeframe): string {
  switch (tf) {
    case "1D":
      return "1";
    case "1W":
      return "7";
    case "1M":
      return "30";
    case "1Y":
      return "365";
    case "5Y":
    case "MAX":
      return "365"; // free /ohlc is capped; longer ranges need a paid plan
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();
  const tfParam = (searchParams.get("tf") || "1Y").toUpperCase() as Timeframe;
  const tf: Timeframe = VALID_TF.includes(tfParam) ? tfParam : "1Y";

  const r = resolveForQuery(symbol);
  let candles: Candle[] = [];
  let notFound = false;
  let error: string | null = null;

  try {
    if (r.coingeckoId) {
      candles = await cgOhlc(r.coingeckoId, cgDays(tf));
    } else if (r.yahoo) {
      const { interval, period1 } = yahooParams(tf);
      candles = await yfChart(r.yahoo, { interval, period1 });
    }
    if (candles.length === 0) notFound = true;
  } catch (e) {
    error = e instanceof Error ? e.message : "history fetch failed";
  }

  return NextResponse.json(
    { data: candles, symbol, tf, notFound, error, source: "live", ts: Date.now() },
    { status: error ? 502 : 200 }
  );
}
