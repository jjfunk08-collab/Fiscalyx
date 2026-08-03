"use client";

import { useEffect, useState } from "react";
import { getYields, getCalendar, type EconEventItem } from "@/lib/api";
import { useTerminal } from "@/lib/store";
import { findInstrument } from "@/lib/universe";
import type { YieldPoint } from "@/types";
import { cn } from "@/lib/utils";

export default function YieldCurve() {
  const [curve, setCurve] = useState<YieldPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("yahoo");

  useEffect(() => {
    let alive = true;
    const load = () =>
      getYields().then((res) => {
        if (!alive) return;
        setCurve(res.curve);
        setError(res.error);
        setSource(res.source || "yahoo");
        setLoading(false);
      });
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>Macro — Yield Curve &amp; Economic Calendar</span>
        <span className="text-term-cyan">US Treasuries</span>
      </div>

      <div className="panel-body">
        {loading ? (
          <div className="p-6 text-center text-term-dim text-xs">Loading Treasury yields…</div>
        ) : curve.length === 0 ? (
          <div className="p-6 flex flex-col items-center gap-1">
            <span className="text-term-red text-sm">No Data Available</span>
            <span className="text-term-dim text-[10px]">
              {error || "Treasury yield data is currently unavailable."}
            </span>
          </div>
        ) : (
          <CurveChart curve={curve} source={source} />
        )}
        <Calendar />
      </div>
    </div>
  );
}

function CurveChart({ curve, source }: { curve: YieldPoint[]; source: string }) {
  const W = 720;
  const H = 240;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const yields = curve.map((p) => p.yield);
  const min = Math.floor(Math.min(...yields) * 2) / 2 - 0.25;
  const max = Math.ceil(Math.max(...yields) * 2) / 2 + 0.25;

  const x = (i: number) =>
    padL + (curve.length <= 1 ? 0.5 : i / (curve.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min || 1)) * (H - padT - padB);

  const path = curve.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.yield)}`).join(" ");

  const gridYs: number[] = [];
  for (let v = min; v <= max + 1e-9; v += 0.5) gridYs.push(Math.round(v * 100) / 100);

  return (
    <div className="p-3 border-b border-term-border">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {gridYs.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#141414" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#4a4a4a">
              {v.toFixed(2)}%
            </text>
          </g>
        ))}

        <path d={path} fill="none" stroke="#FFB000" strokeWidth={1.75} />

        {curve.map((p, i) => (
          <g key={p.tenor}>
            <circle cx={x(i)} cy={y(p.yield)} r={2.5} fill="#00E5FF" />
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={9} fill="#8a8a8a">
              {p.tenor}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex gap-1 mt-2 text-[9px]">
        {curve.map((p) => (
          <div key={p.tenor} className="flex-1 text-center">
            <div className="text-term-gray">{p.tenor}</div>
            <div className="text-term-white">{p.yield.toFixed(2)}</div>
            <div className={cn(p.changeBp >= 0 ? "text-term-green" : "text-term-red")}>
              {p.changeBp >= 0 ? "+" : ""}
              {p.changeBp}bp
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-term-dim mt-2">
        {source === "fred"
          ? "Full constant-maturity curve (1M–30Y) from FRED® (Federal Reserve Bank of St. Louis). This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis."
          : "Partial curve (13W · 5Y · 10Y · 30Y) from Yahoo CBOE yield indices. Set FRED_API_KEY for the full 1M–30Y Treasury curve."}
      </p>
    </div>
  );
}

function Calendar() {
  const [events, setEvents] = useState<EconEventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeSymbol = useTerminal((s) => s.activeSymbol);
  const inst = findInstrument(activeSymbol);

  useEffect(() => {
    let alive = true;
    getCalendar().then((res) => {
      if (!alive) return;
      setEvents(res.events);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const fmt = (d: string) => {
    const dt = new Date(d + "T00:00:00Z");
    return isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };

  return (
    <div className="p-3 space-y-3">
      {inst && (
        <div className="border border-term-border/60 bg-term-panel px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wide text-term-dim">
            Rate sensitivity · {inst.symbol} <span className="opacity-60">(general context)</span>
          </div>
          <div className="text-[10px] text-term-gray leading-snug mt-0.5">
            {rateSensitivity(inst.assetClass)}
          </div>
        </div>
      )}

      <div>
        <div className="text-[11px] uppercase tracking-wide text-term-cyan mb-2">
          Economic Calendar <span className="text-term-dim normal-case">· release schedule</span>
        </div>

        {loading ? (
          <div className="py-4 text-center text-term-dim text-[10px]">Loading release schedule…</div>
        ) : events.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-1 border border-dashed border-term-border">
            <span className="text-term-gray text-xs">No Data Available</span>
            <span className="text-term-dim text-[10px] max-w-[440px] text-center">
              {error || "No upcoming releases found. Set FRED_API_KEY to enable the schedule."}
            </span>
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <tbody>
              {events.map((e, i) => (
                <tr key={`${e.name}-${e.date}-${i}`} className="grid-row">
                  <td className="py-0.5 pr-2 text-term-amber whitespace-nowrap w-16">{fmt(e.date)}</td>
                  <td className="py-0.5 text-term-white">{e.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[9px] text-term-dim mt-2">
          Upcoming US data-release dates from FRED® (Federal Reserve Bank of St. Louis). Dates only;
          forecast/consensus values require a paid econ-calendar vendor. Not endorsed or certified by
          the Federal Reserve Bank of St. Louis.
        </p>
      </div>
    </div>
  );
}

function rateSensitivity(assetClass: string): string {
  switch (assetClass) {
    case "Equity":
      return "Equities — especially high-growth/tech — generally fall when policy rates rise, because higher discount rates reduce the present value of future earnings; rate cuts tend to support valuations.";
    case "Bond":
      return "Bond prices move inversely to yields: rate hikes push yields up and existing bond prices down; longer maturities are more sensitive. This is the yield the panel above tracks.";
    case "FX":
      return "Currencies tend to strengthen when their central bank raises rates relative to others (higher yield attracts capital), and weaken on cuts — the classic rate-differential effect.";
    case "Commodity":
      return "Commodities often face pressure when rates rise (a stronger dollar and higher carrying costs), though supply/demand and inflation hedging can dominate in practice.";
    case "Crypto":
      return "Crypto has traded as a risk-on / high-duration asset — historically weak when rates rise and liquidity tightens, stronger when policy eases — though the relationship is noisy.";
    case "Index":
      return "Broad indices aggregate rate sensitivity across their constituents; rate-sensitive sectors (tech, real estate, utilities) drive much of the move around policy shifts.";
    default:
      return "Central-bank rate changes ripple across asset classes through discount rates, the dollar, and liquidity conditions.";
  }
}
