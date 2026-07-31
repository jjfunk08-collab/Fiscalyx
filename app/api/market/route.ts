import { NextResponse } from "next/server";
import { allQuotes, findInstrument } from "@/lib/mock";
import type { Quote } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FORCE_MOCK = process.env.NEXT_PUBLIC_FORCE_MOCK === "true";
const FINNHUB = process.env.FINNHUB_API_KEY;

// Symbols we can enrich with a real last price when a key is present.
const LIVE_EQUITIES = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "XOM"];

/**
 * Attempt to overlay live last-prices from Finnhub onto the mock
 * snapshot. Any failure (missing key, rate limit, network) leaves
 * the mock value in place — the panel never goes blank.
 */
async function overlayLive(quotes: Quote[]): Promise<"live" | "mock"> {
  if (FORCE_MOCK || !FINNHUB) return "mock";
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));
  let touched = false;
  await Promise.allSettled(
    LIVE_EQUITIES.map(async (sym) => {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const j = (await res.json()) as { c?: number; h?: number; l?: number; o?: number; pc?: number };
      const q = bySymbol.get(sym);
      if (!q || !j.c || j.c <= 0) return;
      q.last = j.c;
      q.high = j.h ?? q.high;
      q.low = j.l ?? q.low;
      q.open = j.o ?? q.open;
      q.prevClose = j.pc ?? q.prevClose;
      q.change = q.last - q.prevClose;
      q.changePct = (q.change / q.prevClose) * 100;
      q.tick = q.change >= 0 ? "up" : "down";
      touched = true;
    })
  );
  return touched ? "live" : "mock";
}

export async function GET() {
  const quotes = allQuotes();
  let source: "live" | "mock" = "mock";
  try {
    source = await overlayLive(quotes);
  } catch {
    source = "mock";
  }
  // Touch findInstrument so tree-shaking keeps the universe import stable.
  void findInstrument;
  return NextResponse.json({ data: quotes, source, ts: Date.now() });
}
