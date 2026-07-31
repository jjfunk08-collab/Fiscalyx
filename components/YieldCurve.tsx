"use client";

import { useMemo } from "react";
import { makeYieldCurve, makeEconCalendar } from "@/lib/mock";
import type { EconEvent } from "@/types";
import { cn, fmtDateTime } from "@/lib/utils";

export default function YieldCurve() {
  const curve = useMemo(() => makeYieldCurve(), []);
  const events = useMemo(() => makeEconCalendar(), []);

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>Macro Terminal — Yield Curve &amp; Economic Calendar</span>
        <span className="text-term-cyan">US Treasuries</span>
      </div>

      <div className="panel-body">
        <CurveChart curve={curve} />
        <Calendar events={events} />
      </div>
    </div>
  );
}

function CurveChart({
  curve,
}: {
  curve: ReturnType<typeof makeYieldCurve>;
}) {
  const W = 720;
  const H = 240;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const yields = curve.map((p) => p.yield);
  const min = Math.floor(Math.min(...yields) * 2) / 2 - 0.25;
  const max = Math.ceil(Math.max(...yields) * 2) / 2 + 0.25;

  const x = (i: number) => padL + (i / (curve.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const path = curve.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.yield)}`).join(" ");

  const gridYs: number[] = [];
  for (let v = min; v <= max + 1e-9; v += 0.5) gridYs.push(Math.round(v * 100) / 100);

  return (
    <div className="p-3 border-b border-term-border">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* horizontal grid + y labels */}
        {gridYs.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#141414" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#4a4a4a">
              {v.toFixed(2)}%
            </text>
          </g>
        ))}

        {/* curve */}
        <path d={path} fill="none" stroke="#FFB000" strokeWidth={1.75} />

        {/* points + x labels */}
        {curve.map((p, i) => (
          <g key={p.tenor}>
            <circle cx={x(i)} cy={y(p.yield)} r={2.5} fill="#00E5FF" />
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={9} fill="#8a8a8a">
              {p.tenor}
            </text>
          </g>
        ))}
      </svg>

      {/* tenor detail row */}
      <div className="grid grid-cols-11 gap-1 mt-2 text-[9px]">
        {curve.map((p) => (
          <div key={p.tenor} className="text-center">
            <div className="text-term-gray">{p.tenor}</div>
            <div className="text-term-white">{p.yield.toFixed(2)}</div>
            <div className={cn(p.changeBp >= 0 ? "text-term-green" : "text-term-red")}>
              {p.changeBp >= 0 ? "+" : ""}
              {p.changeBp}bp
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Calendar({ events }: { events: EconEvent[] }) {
  const impColor: Record<EconEvent["importance"], string> = {
    High: "bg-term-red",
    Medium: "bg-term-amber",
    Low: "bg-term-dim",
  };
  return (
    <div className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-term-cyan mb-2">
        Economic Calendar
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-term-dim text-left">
            <th className="font-normal py-1">Time</th>
            <th className="font-normal py-1">Ctry</th>
            <th className="font-normal py-1">Event</th>
            <th className="font-normal py-1 text-right">Actual</th>
            <th className="font-normal py-1 text-right">Fcst</th>
            <th className="font-normal py-1 text-right">Prev</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const released = e.actual !== null;
            const beat =
              released &&
              parseFloat(e.actual!) > parseFloat(e.forecast);
            return (
              <tr key={e.id} className="grid-row">
                <td className="py-1 text-term-gray whitespace-nowrap">{fmtDateTime(e.time)}</td>
                <td className="py-1 text-term-white">{e.country}</td>
                <td className="py-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full", impColor[e.importance])} />
                    <span className="text-term-white">{e.event}</span>
                  </span>
                </td>
                <td
                  className={cn(
                    "py-1 text-right",
                    !released ? "text-term-dim" : beat ? "text-term-green" : "text-term-red"
                  )}
                >
                  {e.actual ?? "—"}
                </td>
                <td className="py-1 text-right text-term-gray">{e.forecast}</td>
                <td className="py-1 text-right text-term-dim">{e.previous}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
