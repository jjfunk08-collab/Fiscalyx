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
  const [cat, setCat] = useState<Cat>("All");

  useEffect(() => {
    let alive = true;
    const load = () => getNews().then((n) => alive && setItems(n));
    load();
    const t = setInterval(load, 20000); // refresh feed every 20s
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (cat !== "All" && n.category !== cat) return false;
      if (filterSymbol && !n.tickers.includes(filterSymbol)) return false;
      return true;
    });
  }, [items, cat, filterSymbol]);

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
          <div className="px-3 py-6 text-center text-term-dim text-xs">No matching headlines.</div>
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
                <p className="text-[12px] text-term-white leading-snug">{n.headline}</p>
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
