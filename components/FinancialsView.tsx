"use client";

import { useEffect, useState } from "react";
import { getFundamentals } from "@/lib/api";
import { useLive } from "@/components/LiveProvider";
import type { FinancialRow, Fundamentals } from "@/types";
import { fmtMillions, fmtPrice, colorForChange, cn } from "@/lib/utils";

interface State {
  loading: boolean;
  available: boolean;
  reason?: string;
  fundamentals?: Fundamentals;
  years: string[];
}

export default function FinancialsView({ symbol }: { symbol: string }) {
  const { quoteMap } = useLive();
  const q = quoteMap[symbol];
  const [state, setState] = useState<State>({ loading: true, available: false, years: [] });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, available: false, years: [] });
    getFundamentals(symbol).then((res) => {
      if (!alive) return;
      setState({
        loading: false,
        available: res.available,
        reason: res.reason || res.error || undefined,
        fundamentals: res.fundamentals,
        years: res.years || [],
      });
    });
    return () => {
      alive = false;
    };
  }, [symbol]);

  if (state.loading) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span>{symbol} — Fundamentals</span>
        </div>
        <div className="panel-body flex items-center justify-center text-term-dim text-xs">
          Loading fundamentals for {symbol}…
        </div>
      </div>
    );
  }

  if (!state.available || !state.fundamentals) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span>{symbol} — Fundamentals</span>
        </div>
        <div className="panel-body flex flex-col items-center justify-center gap-1">
          <span className="text-term-red text-sm">No Data Available</span>
          <span className="text-term-dim text-[10px] max-w-[420px] text-center">
            {state.reason || `Fundamentals not available for ${symbol}.`}
          </span>
        </div>
      </div>
    );
  }

  const f = state.fundamentals;
  const years = state.years;
  const metrics: { label: string; value: string }[] = [
    { label: "Market Cap", value: fmtCap(f.marketCap) },
    { label: "P/E", value: f.peRatio ? f.peRatio.toFixed(1) : "—" },
    { label: "EPS", value: f.eps ? "$" + f.eps.toFixed(2) : "—" },
    { label: "EV/EBITDA", value: f.evEbitda ? f.evEbitda.toFixed(1) : "—" },
    { label: "Div Yield", value: f.dividendYield ? f.dividendYield.toFixed(2) + "%" : "—" },
    { label: "Beta", value: f.beta ? f.beta.toFixed(2) : "—" },
    { label: "52W High", value: f.week52High ? "$" + f.week52High.toFixed(2) : "—" },
    { label: "52W Low", value: f.week52Low ? "$" + f.week52Low.toFixed(2) : "—" },
  ];

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>
          {f.symbol} — {f.name}
        </span>
        <span className="text-term-cyan">{f.sector}</span>
      </div>

      <div className="panel-body p-3 space-y-3">
        {q && (
          <div className="flex items-baseline gap-3 border-b border-term-border pb-2">
            <span className="text-2xl text-term-white">{fmtPrice(q.last, q.assetClass)}</span>
            <span className={cn("text-sm", colorForChange(q.change))}>
              {q.change >= 0 ? "+" : ""}
              {q.change.toFixed(2)} ({q.changePct >= 0 ? "+" : ""}
              {q.changePct.toFixed(2)}%)
            </span>
            <span className="text-[10px] text-term-dim ml-auto">{q.currency}</span>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-term-gray line-clamp-6">{f.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-term-border">
          {metrics.map((m) => (
            <div key={m.label} className="bg-term-panel px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-term-dim">{m.label}</div>
              <div className="text-sm text-term-amber">{m.value}</div>
            </div>
          ))}
        </div>

        <Statement title="Income Statement" rows={f.income} years={years} />
        <Statement title="Balance Sheet" rows={f.balance} years={years} />
        <Statement title="Cash Flow" rows={f.cashflow} years={years} />

        <p className="text-[9px] text-term-dim pt-1">
          Values in USD millions · fiscal years · source: Yahoo Finance.
        </p>
      </div>
    </div>
  );
}

function fmtCap(n: number): string {
  // marketCap arrives in absolute USD; render compactly.
  if (!n) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString("en-US");
}

function Statement({
  title,
  rows,
  years,
}: {
  title: string;
  rows: FinancialRow[];
  years: string[];
}) {
  const hasData = rows.some((r) => r.values.some((v) => v !== 0));
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-term-cyan mb-1">{title}</div>
      {!hasData ? (
        <div className="text-[10px] text-term-dim py-1">Not reported by the data source.</div>
      ) : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-term-dim">
              <th className="text-left font-normal py-0.5">Line Item</th>
              {years.map((y, i) => (
                <th key={`${y}-${i}`} className="text-right font-normal py-0.5 px-2">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="grid-row">
                <td className="py-0.5 text-term-white">{r.label}</td>
                {r.values.map((v, i) => (
                  <td
                    key={i}
                    className={cn("py-0.5 px-2 text-right", v < 0 ? "text-term-red" : "text-term-gray")}
                  >
                    {fmtMillions(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
