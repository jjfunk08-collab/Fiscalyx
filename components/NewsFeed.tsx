"use client";

import { useEffect, useMemo, useState } from "react";
import { getNews } from "@/lib/api";
import type { NewsItem, Sentiment } from "@/types";
import { cn, relativeTime } from "@/lib/utils";

const CATEGORIES = ["All", "Macro", "CentralBank", "Equity", "Crypto", "Commodity", "FX"] as const;
type Cat = (typeof CATEGORIES)[number];

const sentimentColor: Record<Sentiment, string> = {
  Bullish: "text-term-green",
  Bearish: "text-term-red",
  Neutral: "text-term-gray",
};

export default function NewsFeed({ filterSymbol }: { filterSymbol?: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<Cat>("All");

  useEffect(() => {
    let alive = true;
    const load = () =>
      getNews(filterSymbol).then((res) => {
        if (!alive) return;
        setItems(res.items);
        setError(res.error);
      });
    load();
    const t = setInterval(load, 20000); // refresh feed every 20s
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [filterSymbol]);

  // Server already scopes by symbol via the query; here we only filter by category.
  const filtered = useMemo(() => {
    return items.filter((n) => (cat === "All" ? true : n.category === cat));
  }, [items, cat]);

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>News{filterSymbol ? ` · ${filterSymbol}` : ""}</span>
        <div className="flex items-center overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn("tab", cat === c && "tab-active")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body divide-y divide-term-border/60">
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-term-dim text-xs">
            {error ? `⚠ ${error}` : "No matching headlines."}
          </div>
        )}
        {filtered.map((n) => (
          <article key={n.id} className="px-3 py-2 hover:bg-term-border/30">
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 text-[9px] uppercase font-bold w-14 shrink-0",
                  sentimentColor[n.sentiment]
                )}
                title={`Sentiment score ${n.score}`}
              >
                {n.sentiment.slice(0, 4)}
              </span>
              <div className="min-w-0 flex-1">
                {n.url ? (
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[12px] text-term-white leading-snug hover:text-term-cyan hover:underline"
                  >
                    {n.headline}
                  </a>
                ) : (
                  <p className="text-[12px] text-term-white leading-snug">{n.headline}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-term-dim">
                  <span className="text-term-cyan">{n.source}</span>
                  <span>·</span>
                  <span>{relativeTime(n.time)}</span>
                  {n.tickers.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-term-amber">{n.tickers.join(" ")}</span>
                    </>
                  )}
                  <span className="ml-auto opacity-70">{n.category}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
