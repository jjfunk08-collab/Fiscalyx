// ============================================================
//  /api/options — real options chain (nearest expiry)
//  Source: Yahoo Finance options(). Optionable equities only.
// ============================================================

import { NextResponse } from "next/server";
import type { OptionRow, OptionsChain } from "@/types";
import { findInstrument } from "@/lib/universe";
import { yfOptions } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* eslint-disable @typescript-eslint/no-explicit-any */
const n = (v: any): number | null =>
  typeof v === "number" && isFinite(v) ? v : v && typeof v === "object" && typeof v.raw === "number" ? v.raw : null;

function emptyRow(strike: number): OptionRow {
  return {
    strike,
    callBid: 0, callAsk: 0, callIv: 0, callOi: 0, callVol: 0,
    putBid: 0, putAsk: 0, putIv: 0, putOi: 0, putVol: 0,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase();
  const inst = findInstrument(symbol);

  if (inst && inst.assetClass !== "Equity") {
    return NextResponse.json({
      available: false,
      reason: `Listed options are only available for equities (${symbol} is ${inst.assetClass}).`,
      ts: Date.now(),
    });
  }

  const yahooTicker = inst?.yahoo ?? symbol;

  try {
    const res: any = await yfOptions(yahooTicker);
    const first = res?.options?.[0];
    const spot = n(res?.quote?.regularMarketPrice);

    if (!first || (!first.calls?.length && !first.puts?.length)) {
      return NextResponse.json({
        available: false,
        reason: `No options chain available for ${symbol}.`,
        ts: Date.now(),
      });
    }

    const byStrike = new Map<number, OptionRow>();
    const get = (k: number) => {
      let r = byStrike.get(k);
      if (!r) { r = emptyRow(k); byStrike.set(k, r); }
      return r;
    };

    for (const c of first.calls ?? []) {
      const k = n(c.strike);
      if (k == null) continue;
      const r = get(k);
      r.callBid = n(c.bid) ?? 0;
      r.callAsk = n(c.ask) ?? 0;
      r.callIv = (n(c.impliedVolatility) ?? 0) * 100;
      r.callOi = n(c.openInterest) ?? 0;
      r.callVol = n(c.volume) ?? 0;
    }
    for (const p of first.puts ?? []) {
      const k = n(p.strike);
      if (k == null) continue;
      const r = get(k);
      r.putBid = n(p.bid) ?? 0;
      r.putAsk = n(p.ask) ?? 0;
      r.putIv = (n(p.impliedVolatility) ?? 0) * 100;
      r.putOi = n(p.openInterest) ?? 0;
      r.putVol = n(p.volume) ?? 0;
    }

    let rows = [...byStrike.values()].sort((a, b) => a.strike - b.strike);

    // Trim to a window of ~13 strikes centred on the ATM strike.
    const ref = spot ?? rows[Math.floor(rows.length / 2)]?.strike ?? 0;
    if (rows.length > 13 && ref) {
      let atmIdx = 0;
      let best = Infinity;
      rows.forEach((r, i) => {
        const d = Math.abs(r.strike - ref);
        if (d < best) { best = d; atmIdx = i; }
      });
      const start = Math.max(0, atmIdx - 6);
      rows = rows.slice(start, start + 13);
    }

    const expDate = first.expirationDate ? new Date(first.expirationDate) : null;
    const expiry = expDate && !isNaN(expDate.getTime()) ? expDate.toISOString().slice(0, 10) : "—";

    const chain: OptionsChain = {
      symbol,
      spot: spot ?? ref,
      expiry,
      rows,
    };

    return NextResponse.json({ available: true, chain, source: "live", ts: Date.now() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "options fetch failed";
    return NextResponse.json({ available: false, reason: `No data available (${msg}).`, ts: Date.now() });
  }
}
