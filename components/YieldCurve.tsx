"use client";

import { useEffect, useState } from "react";
import { getYields } from "@/lib/api";
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
        <span>Macro Terminal — Yield Curve &amp; Economic Calendar</span>
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
  return (
    <div className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-term-cyan mb-2">Economic Calendar</div>
      <div className="py-6 flex flex-col items-center gap-1 border border-dashed border-term-border">
        <span className="text-term-gray text-xs">No Data Available</span>
        <span className="text-term-dim text-[10px] max-w-[440px] text-center">
          A live economic calendar requires a dedicated provider (e.g. Trading Economics, FRED
          releases, or an econ-calendar API) that has no free, key-free endpoint. It is intentionally
          left empty rather than populated with simulated events.
        </span>
      </div>
    </div>
  );
}
