// ============================================================
//  /api/market  — live quotes
//  Provider routing:
//    • Crypto                         → CoinGecko
//    • Equities (if FINNHUB_API_KEY)  → Finnhub /quote  (Yahoo fallback on miss)
//    • Equities (no key)              → Yahoo
//    • Indices / FX / commodities /   → Yahoo   (not on Finnhub free tier)
//      treasury rates
//  No mock fallback: unknown/failed tickers are reported explicitly.
// ============================================================

import { NextResponse } from "next/server";
import type { Quote, TickDirection, Instrument } from "@/types";
import { UNIVERSE, findInstrument, resolveForQuery } from "@/lib/universe";
import { cgMarkets } from "@/lib/coingecko";
import { yfQuotes, type YahooQuote } from "@/lib/yahoo";
import { isFinnhubEnabled, fhQuote } from "@/lib/finnhub";

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

  const useFinnhub = isFinnhubEnabled();

  const cryptoIds: string[] = [];
  const cgInstById = new Map<string, Instrument>();
  const finnhubEquities: Instrument[] = [];
  const yahooTickers: string[] = [];
  const yInstByTicker = new Map<string, Instrument>();

  const addYahoo = (inst: Instrument, ticker: string) => {
    yahooTickers.push(ticker);
    yInstByTicker.set(ticker, inst);
  };

  for (const sym of requested) {
    const r = resolveForQuery(sym);
    const inst: Instrument =
      r.instrument ??
      { symbol: sym, name: r.name, assetClass: r.assetClass, currency: r.currency, yahoo: r.yahoo };
    if (r.coingeckoId) {
      cryptoIds.push(r.coingeckoId);
      cgInstById.set(r.coingeckoId, inst);
    } else if (useFinnhub && inst.assetClass === "Equity") {
      finnhubEquities.push(inst);
    } else if (r.yahoo) {
      addYahoo(inst, r.yahoo);
    }
  }

  const quotes: Quote[] = [];
  const errors: string[] = [];

  const cgP = cgMarkets(cryptoIds);

  // --- Equities (Finnhub) --- per-symbol; misses fall through to Yahoo.
  if (finnhubEquities.length > 0) {
    const results = await Promise.allSettled(
      finnhubEquities.map(async (inst) => ({ inst, q: await fhQuote(inst.symbol) }))
    );
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const inst = finnhubEquities[i];
      if (res.status === "fulfilled" && (num(res.value.q.c) ?? 0) > 0) {
        const q = res.value.q;
        const last = q.c;
        const prevClose = num(q.pc) ?? last;
        const change = num(q.d) ?? last - prevClose;
        const changePct = num(q.dp) ?? (prevClose ? (change / prevClose) * 100 : 0);
        const spread = Math.abs(last) * 0.0006;
        quotes.push({
          symbol: inst.symbol,
          name: inst.name,
          assetClass: "Equity",
          currency: inst.currency,
          last,
          bid: last - spread / 2,
          ask: last + spread / 2,
          change,
          changePct,
          high: num(q.h) ?? last,
          low: num(q.l) ?? last,
          open: num(q.o) ?? prevClose,
          prevClose,
          volume: 0,
          marketCap: null,
          peRatio: null,
          tick: tickOf(change),
          updated: Date.now(),
        });
      } else if (inst.yahoo) {
        addYahoo(inst, inst.yahoo);
      }
    }
  }

  const [cgRes, yfRes] = await Promise.allSettled([cgP, yfQuotes(yahooTickers)]);

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

  const order = new Map(UNIVERSE.map((i, idx) => [i.symbol, idx]));
  quotes.sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));

  const error =
    quotes.length === 0
      ? errors.length
        ? "Upstream data providers are unavailable."
        : "No data available for the requested symbols."
      : null;

  void findInstrument;

  return NextResponse.json(
    {
      data: quotes,
      notFound,
      error,
      source: useFinnhub ? "finnhub+coingecko+yahoo" : "yahoo+coingecko",
      ts: Date.now(),
    },
    { status: error && quotes.length === 0 ? 502 : 200 }
  );
}
