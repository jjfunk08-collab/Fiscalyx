// ============================================================
//  /api/market  — live quotes & fundamentals
//  Equities / indices / FX / commodities / rates → Yahoo Finance
//  Crypto → CoinGecko
//  No mock fallback: unknown/failed tickers are reported explicitly.
// ============================================================

import { NextResponse } from "next/server";
import type { Quote, TickDirection, Instrument } from "@/types";
import { UNIVERSE, findInstrument, resolveForQuery } from "@/lib/universe";
import { cgMarkets } from "@/lib/coingecko";
import { yfQuotes, type YahooQuote } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const num = (v: unknown): number | null =>
  typeof v === "number" && isFinite(v) ? v : null;

const tickOf = (change: number): TickDirection =>
  change > 0 ? "up" : change < 0 ? "down" : "flat";

function yahooToQuote(inst: Instrument, y: YahooQuote): Quote | null {
  const last = num(y.regularMarketPrice);
  if (last == null) return null;
  const prevClose = num(y.regularMarketPreviousClose) ?? last;
  const change = num(y.regularMarketChange) ?? last - prevClose;
  const changePct =
    num(y.regularMarketChangePercent) ?? (prevClose ? (change / prevClose) * 100 : 0);
  const spread = Math.abs(last) * (inst.assetClass === "FX" ? 0.00008 : 0.0006);
  return {
    symbol: inst.symbol,
    name: y.shortName || y.longName || inst.name,
    assetClass: inst.assetClass,
    currency: y.currency || inst.currency,
    last,
    bid: num(y.bid) ?? last - spread / 2,
    ask: num(y.ask) ?? last + spread / 2,
    change,
    changePct,
    high: num(y.regularMarketDayHigh) ?? last,
    low: num(y.regularMarketDayLow) ?? last,
    open: num(y.regularMarketOpen) ?? prevClose,
    prevClose,
    volume: num(y.regularMarketVolume) ?? 0,
    marketCap: num(y.marketCap),
    peRatio: num(y.trailingPE),
    tick: tickOf(change),
    updated: Date.now(),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("symbols") || searchParams.get("symbol");
  const requested = raw
    ? raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : UNIVERSE.map((i) => i.symbol);

  // Resolve each requested symbol to a provider target.
  const cryptoIds: string[] = [];
  const cgInstById = new Map<string, Instrument>();
  const yahooTickers: string[] = [];
  const yInstByTicker = new Map<string, Instrument>();

  for (const sym of requested) {
    const r = resolveForQuery(sym);
    const inst: Instrument =
      r.instrument ??
      { symbol: sym, name: r.name, assetClass: r.assetClass, currency: r.currency, yahoo: r.yahoo };
    if (r.coingeckoId) {
      cryptoIds.push(r.coingeckoId);
      cgInstById.set(r.coingeckoId, inst);
    } else if (r.yahoo) {
      yahooTickers.push(r.yahoo);
      yInstByTicker.set(r.yahoo, inst);
    }
  }

  const quotes: Quote[] = [];
  const errors: string[] = [];

  const [cgRes, yfRes] = await Promise.allSettled([
    cgMarkets(cryptoIds),
    yfQuotes(yahooTickers),
  ]);

  // --- Crypto (CoinGecko) ---
  if (cgRes.status === "fulfilled") {
    for (const m of cgRes.value) {
      const inst = cgInstById.get(m.id);
      if (!inst) continue;
      const last = num(m.current_price);
      if (last == null) continue;
      const change = num(m.price_change_24h) ?? 0;
      const changePct = num(m.price_change_percentage_24h) ?? 0;
      const prevClose = last - change;
      quotes.push({
        symbol: inst.symbol,
        name: inst.name,
        assetClass: "Crypto",
        currency: "USD",
        last,
        bid: last,
        ask: last,
        change,
        changePct,
        high: num(m.high_24h) ?? last,
        low: num(m.low_24h) ?? last,
        open: prevClose,
        prevClose,
        volume: num(m.total_volume) ?? 0,
        marketCap: num(m.market_cap),
        peRatio: null,
        tick: tickOf(change),
        updated: Date.now(),
      });
    }
  } else if (cryptoIds.length > 0) {
    errors.push("crypto");
  }

  // --- Everything else (Yahoo) ---
  if (yfRes.status === "fulfilled") {
    const bySym = new Map(yfRes.value.map((y) => [y.symbol, y]));
    for (const [ticker, inst] of yInstByTicker) {
      const y = bySym.get(ticker);
      const q = y ? yahooToQuote(inst, y) : null;
      if (q) quotes.push(q);
    }
  } else if (yahooTickers.length > 0) {
    errors.push("yahoo");
  }

  const found = new Set(quotes.map((q) => q.symbol));
  const notFound = requested.filter((s) => !found.has(s));

  // Preserve the registry ordering for a stable monitor.
  const order = new Map(UNIVERSE.map((i, idx) => [i.symbol, idx]));
  quotes.sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));

  const error =
    quotes.length === 0
      ? errors.length
        ? "Upstream data providers are unavailable."
        : "No data available for the requested symbols."
      : null;

  // Touch findInstrument so the import is always retained.
  void findInstrument;

  return NextResponse.json(
    { data: quotes, notFound, error, source: "live", ts: Date.now() },
    { status: error && quotes.length === 0 ? 502 : 200 }
  );
}
