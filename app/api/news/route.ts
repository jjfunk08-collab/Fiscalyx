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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();

  // --- Finnhub path ---
  if (isFinnhubEnabled()) {
    try {
      const upper = query.toUpperCase();
      const inst = query ? findInstrument(upper) : undefined;
      const isTickerish = query && (inst?.assetClass === "Equity" || /^[A-Z]{1,5}$/.test(upper));
      const raw = isTickerish ? await fhCompanyNews(upper, 30) : await fhGeneralNews("general");
      const items = fromFinnhub(raw);
      if (items.length > 0) {
        const error = null;
        return NextResponse.json({ data: items, query, error, source: "finnhub", ts: Date.now() });
      }
      // fall through to Yahoo if Finnhub returned nothing
    } catch {
      /* fall through to Yahoo */
    }
  }

  // --- Yahoo fallback ---
  try {
    const raw = await yfSearchNews(query || "stock market", 25);
    const items: NewsItem[] = raw
      .filter((n) => n && n.title)
      .map((n, i) => {
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
      })
      .sort((a, b) => b.time - a.time);

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
