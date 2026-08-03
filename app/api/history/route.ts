// ============================================================
//  /api/history — live OHLC candles
//  Crypto → CoinGecko /ohlc
//  Equities/others:
//    • default            → Yahoo chart()  (Finnhub free blocks candles)
//    • FINNHUB_ENABLE_CANDLES=true (paid) → Finnhub /stock/candle,
//      with automatic Yahoo fallback if Finnhub returns no data / 403
// ============================================================

import { NextResponse } from "next/server";
import type { Candle, Timeframe } from "@/types";
import { resolveForQuery } from "@/lib/universe";
import { cgOhlc } from "@/lib/coingecko";
import { yfChart } from "@/lib/yahoo";
import { finnhubCandlesEnabled, fhCandle } from "@/lib/finnhub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TF: Timeframe[] = ["1D", "1W", "1M", "1Y", "5Y", "MAX"];
const DAY = 86_400_000;

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
      return "365";
  }
}

// Finnhub resolution + lookback window per timeframe (paid candle endpoint).
function finnhubParams(tf: Timeframe): { resolution: string; from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const secDay = 86_400;
  switch (tf) {
    case "1D":
      return { resolution: "5", from: to - 3 * secDay, to };
    case "1W":
      return { resolution: "30", from: to - 8 * secDay, to };
    case "1M":
      return { resolution: "D", from: to - 33 * secDay, to };
    case "1Y":
      return { resolution: "D", from: to - 366 * secDay, to };
    case "5Y":
      return { resolution: "W", from: to - 5 * 366 * secDay, to };
    case "MAX":
      return { resolution: "M", from: to - 25 * 366 * secDay, to };
  }
}

async function yahooCandles(ySymbol: string, tf: Timeframe): Promise<Candle[]> {
  const { interval, period1 } = yahooParams(tf);
  return yfChart(ySymbol, { interval, period1 });
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
  let source = "yahoo";

  try {
    if (r.coingeckoId) {
      candles = await cgOhlc(r.coingeckoId, cgDays(tf));
      source = "coingecko";
    } else if (finnhubCandlesEnabled() && r.instrument?.assetClass === "Equity") {
      // Paid Finnhub candles, with Yahoo fallback on empty/403.
      try {
        const { resolution, from, to } = finnhubParams(tf);
        const c = await fhCandle(symbol, resolution, from, to);
        if (c && c.s === "ok" && Array.isArray(c.t)) {
          candles = c.t.map((t, i) => ({
            time: t,
            open: c.o[i],
            high: c.h[i],
            low: c.l[i],
            close: c.c[i],
            volume: c.v?.[i] ?? 0,
          }));
          source = "finnhub";
        }
      } catch {
        /* fall through to Yahoo */
      }
      if (candles.length === 0 && r.yahoo) {
        candles = await yahooCandles(r.yahoo, tf);
        source = "yahoo";
      }
    } else if (r.yahoo) {
      candles = await yahooCandles(r.yahoo, tf);
      source = "yahoo";
    }
    if (candles.length === 0) notFound = true;
  } catch (e) {
    error = e instanceof Error ? e.message : "history fetch failed";
  }

  return NextResponse.json(
    { data: candles, symbol, tf, notFound, error, source, ts: Date.now() },
    { status: error ? 502 : 200 }
  );
}
