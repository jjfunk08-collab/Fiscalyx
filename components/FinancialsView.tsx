"use client";

import { useMemo } from "react";
import { makeFundamentals, FUNDAMENTALS_YEARS } from "@/lib/mock";
import { useLive } from "@/components/LiveProvider";
import type { FinancialRow } from "@/types";
import { fmtMillions, fmtPrice, colorForChange, cn } from "@/lib/utils";

export default function FinancialsView({ symbol }: { symbol: string }) {
  const { quoteMap } = useLive();
  const q = quoteMap[symbol];
  const f = useMemo(() => makeFundamentals(symbol), [symbol]);

  const metrics: { label: string; value: string }[] = [
    { label: "Market Cap", value: "$" + fmtMillions(f.marketCap) },
    { label: "P/E", value: f.peRatio.toFixed(1) },
    { label: "EPS", value: "$" + f.eps.toFixed(2) },
    { label: "EV/EBITDA", value: f.evEbitda.toFixed(1) },
    { label: "Div Yield", value: f.dividendYield.toFixed(2) + "%" },
    { label: "Beta", value: f.beta.toFixed(2) },
    { label: "52W High", value: "$" + f.week52High.toFixed(2) },
    { label: "52W Low", value: "$" + f.week52Low.toFixed(2) },
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
        {/* Live price banner */}
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

        {/* Description */}
        <p className="text-[11px] leading-relaxed text-term-gray">{f.description}</p>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-term-border">
          {metrics.map((m) => (
            <div key={m.label} className="bg-term-panel px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-term-dim">{m.label}</div>
              <div className="text-sm text-term-amber">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Statements */}
        <Statement title="Income Statement" rows={f.income} />
        <Statement title="Balance Sheet" rows={f.balance} />
        <Statement title="Cash Flow" rows={f.cashflow} />

        <p className="text-[9px] text-term-dim pt-1">
          Values in USD millions · fiscal years · figures are simulated by the mock fundamentals engine.
        </p>
      </div>
    </div>
  );
}

function Statement({ title, rows }: { title: string; rows: FinancialRow[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-term-cyan mb-1">{title}</div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-term-dim">
            <th className="text-left font-normal py-0.5">Line Item</th>
            {FUNDAMENTALS_YEARS.map((y) => (
              <th key={y} className="text-right font-normal py-0.5 px-2">
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
    </div>
  );
}
