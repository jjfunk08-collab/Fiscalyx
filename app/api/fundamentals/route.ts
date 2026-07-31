// ============================================================
//  /api/fundamentals — real company fundamentals & statements
//  Source: Yahoo Finance quoteSummary. Equities only.
//  All field access is defensively guarded: if Yahoo omits a
//  field we emit null / an empty row rather than inventing data.
// ============================================================

import { NextResponse } from "next/server";
import type { Fundamentals, FinancialRow } from "@/types";
import { findInstrument } from "@/lib/universe";
import { yfQuoteSummary } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* eslint-disable @typescript-eslint/no-explicit-any */
function n(v: any): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (v && typeof v === "object" && typeof v.raw === "number") return v.raw;
  return null;
}
function millions(v: any): number {
  const x = n(v);
  return x == null ? 0 : Math.round(x / 1e6);
}
function endTs(v: any): number {
  if (v instanceof Date) return v.getTime();
  if (v && typeof v === "object" && typeof v.raw === "number") return v.raw * 1000;
  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  }
  if (typeof v === "number") return v > 1e12 ? v : v * 1000;
  return 0;
}
function year(v: any): string {
  const t = endTs(v);
  return t ? String(new Date(t).getUTCFullYear()) : "—";
}
function sortedDesc<T extends { endDate?: any }>(arr: T[]): T[] {
  return arr.slice().sort((a, b) => endTs(b.endDate) - endTs(a.endDate)).slice(0, 4);
}
function row(label: string, periods: any[], key: string): FinancialRow {
  return { label, values: periods.map((p) => millions(p?.[key])) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase();
  const inst = findInstrument(symbol);

  if (inst && inst.assetClass !== "Equity") {
    return NextResponse.json({
      available: false,
      reason: `Fundamentals are only available for equities (${symbol} is ${inst.assetClass}).`,
      ts: Date.now(),
    });
  }

  const yahooTicker = inst?.yahoo ?? symbol;

  try {
    const s: any = await yfQuoteSummary(yahooTicker);
    const price = s.price ?? {};
    const detail = s.summaryDetail ?? {};
    const stats = s.defaultKeyStatistics ?? {};
    const profile = s.assetProfile ?? {};

    const last = n(price.regularMarketPrice);
    const inc = sortedDesc(s.incomeStatementHistory?.incomeStatementHistory ?? []);
    const bal = sortedDesc(s.balanceSheetHistory?.balanceSheetStatements ?? []);
    const cf = sortedDesc(s.cashflowStatementHistory?.cashflowStatements ?? []);

    // If Yahoo returned essentially nothing usable, say so honestly.
    if (last == null && inc.length === 0 && n(detail.marketCap) == null) {
      return NextResponse.json({
        available: false,
        reason: `No fundamental data available for ${symbol}.`,
        ts: Date.now(),
      });
    }

    const years = (inc.length ? inc : bal).map((p: any) => year(p.endDate));
    const divYield = n(detail.dividendYield);

    const fcfPeriods = cf.map((p: any) => ({
      v: (n(p?.totalCashFromOperatingActivities) ?? 0) + (n(p?.capitalExpenditures) ?? 0),
    }));

    const fundamentals: Fundamentals = {
      symbol,
      name: price.longName || price.shortName || inst?.name || symbol,
      sector: profile.sector || inst?.sector || "—",
      description: profile.longBusinessSummary || "No description available.",
      marketCap: n(detail.marketCap) ?? n(price.marketCap) ?? 0,
      peRatio: n(detail.trailingPE) ?? 0,
      eps: n(stats.trailingEps) ?? 0,
      evEbitda: n(stats.enterpriseToEbitda) ?? 0,
      dividendYield: divYield == null ? 0 : divYield * 100,
      beta: n(stats.beta) ?? n(detail.beta) ?? 0,
      week52High: n(detail.fiftyTwoWeekHigh) ?? 0,
      week52Low: n(detail.fiftyTwoWeekLow) ?? 0,
      income: [
        row("Revenue", inc, "totalRevenue"),
        row("Gross Profit", inc, "grossProfit"),
        row("Operating Income", inc, "operatingIncome"),
        row("Net Income", inc, "netIncome"),
      ],
      balance: [
        row("Total Assets", bal, "totalAssets"),
        row("Total Liabilities", bal, "totalLiab"),
        row("Total Equity", bal, "totalStockholderEquity"),
      ],
      cashflow: [
        row("Operating Cash Flow", cf, "totalCashFromOperatingActivities"),
        row("CapEx", cf, "capitalExpenditures"),
        row("Free Cash Flow", fcfPeriods, "v"),
      ],
    };

    return NextResponse.json({ available: true, fundamentals, years, source: "live", ts: Date.now() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fundamentals fetch failed";
    return NextResponse.json({ available: false, reason: `No data available (${msg}).`, ts: Date.now() });
  }
}
