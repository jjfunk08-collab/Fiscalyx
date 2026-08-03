// ============================================================
//  /api/news — live financial headlines
//    • FINNHUB_API_KEY set → Finnhub company-news (symbol) / general news
//    • otherwise           → Yahoo Finance search
//  Category & sentiment are deterministic keyword classifiers over the
//  real headline text (not random, not fabricated).
// ============================================================

import { NextResponse } from "next/server";
import type { NewsItem, Sentiment } from "@/types";
import { yfSearchNews } from "@/lib/yahoo";
import { isFinnhubEnabled, fhCompanyNews, fhGeneralNews, type FhNews } from "@/lib/finnhub";
import { findInstrument } from "@/lib/universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function classify(text: string): NewsItem["category"] {
  const t = text.toLowerCase();
  if (/(fed|fomc|ecb|boe|boj|central bank|rate decision|powell|lagarde)/.test(t)) return "CentralBank";
  if (/(cpi|inflation|payroll|jobs|gdp|unemployment|pmi|retail sales|jobless)/.test(t)) return "Macro";
  if (/(bitcoin|btc|ethereum|eth|crypto|solana|token|blockchain)/.test(t)) return "Crypto";
  if (/(oil|crude|brent|gold|silver|copper|natural gas|commodit|wheat|corn)/.test(t)) return "Commodity";
  if (/(dollar|euro|yen|forex|currency|fx|sterling|pound)/.test(t)) return "FX";
  return "Equity";
}

function sentimentOf(text: string): { sentiment: Sentiment; score: number } {
  const t = text.toLowerCase();
  const bull = /(rally|rallies|surge|soar|jump|gain|beat|beats|upgrade|record|higher|rise|rises|climb|top|outperform|boost)/.test(t);
  const bear = /(slump|slide|slides|plunge|fall|falls|drop|miss|misses|downgrade|lower|cut|warn|weak|loss|tumble|sink|underperform)/.test(t);
  let score = 0;
  if (bull && !bear) score = 0.5;
  else if (bear && !bull) score = -0.5;
  const sentiment: Sentiment = score > 0.15 ? "Bullish" : score < -0.15 ? "Bearish" : "Neutral";
  return { sentiment, score };
}

function fromFinnhub(raw: FhNews[]): NewsItem[] {
  return raw
    .filter((n) => n && n.headline)
    .map((n, i) => {
      const { sentiment, score } = sentimentOf(n.headline);
      const time = n.datetime ? n.datetime * 1000 : Date.now();
      const tickers = n.related
        ? n.related.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4)
        : [];
      return {
        id: n.id ? `fh-${n.id}` : `fh-${i}-${time}`,
        headline: n.headline,
        source: n.source || "Finnhub",
        category: classify(n.headline),
        tickers,
        sentiment,
        score,
        time: isFinite(time) ? time : Date.now(),
        body: n.summary || "",
        url: n.url,
      } as NewsItem;
    })
    .sort((a, b) => b.time - a.time)
    .slice(0, 30);
}

function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const n of items) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  return out.sort((a, b) => b.time - a.time).slice(0, 40);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();

  // --- Finnhub path ---
  if (isFinnhubEnabled()) {
    try {
      const upper = query.toUpperCase();
      const inst = query ? findInstrument(upper) : undefined;
      const isTickerish = query && (inst?.assetClass === "Equity" || /^[A-Z]{1,5}$/.test(upper));

      // When a symbol is active, pull BOTH its company news and general
      // market news. Company news alone is almost never tagged Macro or
      // CentralBank (Apple headlines don't mention CPI or the Fed), which
      // left those category tabs empty even though headlines exist —
      // merging in general news gives the tabs something real to filter.
      const [companyRes, generalRes] = await Promise.allSettled([
        isTickerish ? fhCompanyNews(upper, 30) : Promise.resolve([]),
        fhGeneralNews("general"),
      ]);
      const companyItems = companyRes.status === "fulfilled" ? fromFinnhub(companyRes.value) : [];
      const generalItems = generalRes.status === "fulfilled" ? fromFinnhub(generalRes.value) : [];
      const items = dedupe([...companyItems, ...generalItems]);

      if (items.length > 0) {
        return NextResponse.json({ data: items, query, error: null, source: "finnhub", ts: Date.now() });
      }
      // fall through to Yahoo if Finnhub returned nothing at all
    } catch {
      /* fall through to Yahoo */
    }
  }

  // --- Yahoo fallback ---
  try {
    // Same reasoning as the Finnhub path: if a symbol is active, also pull
    // a broad "stock market" query so category tabs aren't limited to
    // whatever that one company's headlines happen to mention.
    const queries = query ? [query, "stock market"] : ["stock market"];
    const results = await Promise.allSettled(queries.map((q) => yfSearchNews(q, 25)));

    const toItem = (n: any, i: number): NewsItem => {
      const { sentiment, score } = sentimentOf(n.title);
      const time = n.providerPublishTime ? new Date(n.providerPublishTime).getTime() : Date.now();
      return {
        id: n.uuid || `news-${i}-${time}`,
        headline: n.title,
        source: n.publisher || "Yahoo Finance",
        category: classify(n.title),
        tickers: Array.isArray(n.relatedTickers) ? n.relatedTickers.slice(0, 4) : [],
        sentiment,
        score,
        time: isFinite(time) ? time : Date.now(),
        body: "",
        url: n.link,
      };
    };

    const items = dedupe(
      results.flatMap((r, qi) =>
        r.status === "fulfilled"
          ? r.value.filter((n) => n && n.title).map((n, i) => toItem(n, qi * 1000 + i))
          : []
      )
    );

    const error = items.length === 0 ? "No headlines returned for this query." : null;
    return NextResponse.json({ data: items, query, error, source: "yahoo", ts: Date.now() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "news fetch failed";
    return NextResponse.json(
      { data: [], query, error: msg, source: "yahoo", ts: Date.now() },
      { status: 502 }
    );
  }
}
