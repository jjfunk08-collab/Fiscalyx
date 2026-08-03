// ============================================================
//  /api/fundamentals — company fundamentals & statements (equities only)
//    • FINNHUB_API_KEY set → Finnhub /stock/metric + /stock/profile2
//                            + /stock/financials-reported
//    • otherwise           → Yahoo Finance quoteSummary
//  Every field is defensively guarded: missing data yields null / an
//  empty row rather than a fabricated number.
// ============================================================

import { NextResponse } from "next/server";
import type { Fundamentals, FinancialRow } from "@/types";
import { findInstrument } from "@/lib/universe";
import { yfQuoteSummary } from "@/lib/yahoo";
import { isFinnhubEnabled, fhMetric, fhProfile, fhFinancialsReported } from "@/lib/finnhub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* eslint-disable @typescript-eslint/no-explicit-any */
function n(v: any): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && isFinite(Number(v))) return Number(v);
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

// ---------- Finnhub statement helpers ----------
function conceptVal(arr: any[], candidates: string[]): number {
  if (!Array.isArray(arr)) return 0;
  const cand = candidates.map((c) => c.toLowerCase());
  for (const item of arr) {
    const concept = String(item?.concept ?? "").replace(/^.*_/, "").toLowerCase();
    if (cand.includes(concept)) {
      const val = n(item?.value);
      if (val != null) return val;
    }
  }
  return 0;
}
function fhRow(label: string, periods: any[], candidates: string[], negate = false): FinancialRow {
  return {
    label,
    values: periods.map((p) => {
      const raw = conceptVal(p?.report?.ic ?? p?.report?.bs ?? p?.report?.cf ?? [], candidates);
      // search all three statement arrays (concept may live in any)
      const v =
        raw ||
        conceptVal(p?.report?.ic ?? [], candidates) ||
        conceptVal(p?.report?.bs ?? [], candidates) ||
        conceptVal(p?.report?.cf ?? [], candidates);
      return Math.round(((negate ? -v : v) || 0) / 1e6);
    }),
  };
}

async function finnhubFundamentals(symbol: string, inst: any) {
  const [metricRes, profileRes, finRes] = await Promise.allSettled([
    fhMetric(symbol),
    fhProfile(symbol),
    fhFinancialsReported(symbol),
  ]);

  const metric: any = metricRes.status === "fulfilled" ? metricRes.value?.metric ?? {} : {};
  const profile: any = profileRes.status === "fulfilled" ? profileRes.value ?? {} : {};
  const finData: any[] =
    finRes.status === "fulfilled" && Array.isArray(finRes.value?.data) ? finRes.value.data : [];

  const hasMetric = metric && Object.keys(metric).length > 0;
  if (!hasMetric && finData.length === 0) {
    return { available: false as const, reason: `No fundamental data available for ${symbol}.` };
  }

  // Annual periods, most recent first, up to 4.
  const annual = finData
    .filter((d) => (d?.form ? String(d.form).includes("10-K") : d?.quarter === 0))
    .sort((a, b) => Number(b?.year ?? 0) - Number(a?.year ?? 0))
    .slice(0, 4);
  const years = annual.map((d) => String(d?.year ?? year(d?.endDate)));

  const mcMillions = n(metric.marketCapitalization); // Finnhub returns USD millions
  const divY = n(metric.dividendYieldIndicatedAnnual);

  const fundamentals: Fundamentals = {
    symbol,
    name: profile.name || inst?.name || symbol,
    sector: profile.finnhubIndustry || inst?.sector || "—",
    description: profile.name
      ? `${profile.name}${profile.exchange ? " · " + profile.exchange : ""}${
          profile.ipo ? " · IPO " + profile.ipo : ""
        }`
      : "No description available.",
    marketCap: mcMillions == null ? 0 : mcMillions * 1e6,
    peRatio: n(metric.peTTM) ?? n(metric.peBasicExclExtraTTM) ?? 0,
    eps: n(metric.epsTTM) ?? n(metric.epsBasicExclExtraItemsTTM) ?? 0,
    evEbitda: n(metric["evToEbitdaTTM"]) ?? n(metric["currentEv/ebitdaTTM"]) ?? 0,
    dividendYield: divY == null ? 0 : divY,
    beta: n(metric.beta) ?? 0,
    week52High: n(metric["52WeekHigh"]) ?? 0,
    week52Low: n(metric["52WeekLow"]) ?? 0,
    income: [
      fhRow("Revenue", annual, ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"]),
      fhRow("Gross Profit", annual, ["GrossProfit"]),
      fhRow("Operating Income", annual, ["OperatingIncomeLoss"]),
      fhRow("Net Income", annual, ["NetIncomeLoss", "ProfitLoss"]),
    ],
    balance: [
      fhRow("Total Assets", annual, ["Assets"]),
      fhRow("Total Liabilities", annual, ["Liabilities"]),
      fhRow("Total Equity", annual, ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]),
    ],
    cashflow: [
      fhRow("Operating Cash Flow", annual, ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"]),
      fhRow("CapEx", annual, ["PaymentsToAcquirePropertyPlantAndEquipment"], true),
      // FCF = OCF - CapEx(payments)
      {
        label: "Free Cash Flow",
        values: annual.map((p) => {
          const ocf = conceptVal(p?.report?.cf ?? [], ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"]);
          const capex = conceptVal(p?.report?.cf ?? [], ["PaymentsToAcquirePropertyPlantAndEquipment"]);
          return Math.round(((ocf - capex) || 0) / 1e6);
        }),
      },
    ],
  };

  return { available: true as const, fundamentals, years };
}

// ---------- Yahoo fallback ----------
function sortedDesc<T extends { endDate?: any }>(arr: T[]): T[] {
  return arr.slice().sort((a, b) => endTs(b.endDate) - endTs(a.endDate)).slice(0, 4);
}
function yRow(label: string, periods: any[], key: string): FinancialRow {
  return { label, values: periods.map((p) => millions(p?.[key])) };
}
async function yahooFundamentals(symbol: string, yahooTicker: string, inst: any) {
  const s: any = await yfQuoteSummary(yahooTicker);
  const price = s.price ?? {};
  const detail = s.summaryDetail ?? {};
  const stats = s.defaultKeyStatistics ?? {};
  const profile = s.assetProfile ?? {};

  const last = n(price.regularMarketPrice);
  const inc = sortedDesc(s.incomeStatementHistory?.incomeStatementHistory ?? []);
  const bal = sortedDesc(s.balanceSheetHistory?.balanceSheetStatements ?? []);
  const cf = sortedDesc(s.cashflowStatementHistory?.cashflowStatements ?? []);

  if (last == null && inc.length === 0 && n(detail.marketCap) == null) {
    return { available: false as const, reason: `No fundamental data available for ${symbol}.` };
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
      yRow("Revenue", inc, "totalRevenue"),
      yRow("Gross Profit", inc, "grossProfit"),
      yRow("Operating Income", inc, "operatingIncome"),
      yRow("Net Income", inc, "netIncome"),
    ],
    balance: [
      yRow("Total Assets", bal, "totalAssets"),
      yRow("Total Liabilities", bal, "totalLiab"),
      yRow("Total Equity", bal, "totalStockholderEquity"),
    ],
    cashflow: [
      yRow("Operating Cash Flow", cf, "totalCashFromOperatingActivities"),
      yRow("CapEx", cf, "capitalExpenditures"),
      { label: "Free Cash Flow", values: fcfPeriods.map((p: any) => millions(p.v)) },
    ],
  };
  return { available: true as const, fundamentals, years };
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

  try {
    let result;
    if (isFinnhubEnabled()) {
      result = await finnhubFundamentals(symbol, inst);
      // If Finnhub had nothing, try Yahoo as a fallback.
      if (!result.available && (inst?.yahoo || symbol)) {
        try {
          result = await yahooFundamentals(symbol, inst?.yahoo ?? symbol, inst);
        } catch {
          /* keep the Finnhub "unavailable" result */
        }
      }
    } else {
      result = await yahooFundamentals(symbol, inst?.yahoo ?? symbol, inst);
    }

    if (!result.available) {
      return NextResponse.json({ available: false, reason: result.reason, ts: Date.now() });
    }
    return NextResponse.json({
      available: true,
      fundamentals: result.fundamentals,
      years: result.years,
      source: isFinnhubEnabled() ? "finnhub" : "yahoo",
      ts: Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fundamentals fetch failed";
    return NextResponse.json({ available: false, reason: `No data available (${msg}).`, ts: Date.now() });
  }
}
