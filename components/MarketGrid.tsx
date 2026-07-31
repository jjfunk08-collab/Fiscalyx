"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useLive } from "@/components/LiveProvider";
import { useTerminal } from "@/lib/store";
import type { AssetClass, Quote } from "@/types";
import {
  cn,
  fmtPrice,
  fmtChange,
  fmtPct,
  fmtVolume,
  colorForChange,
} from "@/lib/utils";

const TABS: { key: "ALL" | AssetClass; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "Index", label: "Indices" },
  { key: "Equity", label: "Equities" },
  { key: "Commodity", label: "Commodities" },
  { key: "FX", label: "Forex" },
  { key: "Crypto", label: "Crypto" },
  { key: "Bond", label: "Bonds" },
];

export default function MarketGrid({ compact = false }: { compact?: boolean }) {
  const { quotes, ticks, updatedAt } = useLive();
  const setActive = useTerminal((s) => s.setActive);
  const [tab, setTab] = useState<"ALL" | AssetClass>("ALL");

  const rows = quotes.filter((q) => tab === "ALL" || q.assetClass === tab);

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>Market Monitor</span>
        <div className="flex items-center gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn("tab", tab === t.key && "tab-active")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 bg-term-bg text-term-gray z-10">
            <tr className="text-left">
              <Th>Ticker</Th>
              {!compact && <Th>Name</Th>}
              <Th right>Last</Th>
              {!compact && <Th right>Bid</Th>}
              {!compact && <Th right>Ask</Th>}
              <Th right>Chg</Th>
              <Th right>Chg%</Th>
              {!compact && <Th right>High</Th>}
              {!compact && <Th right>Low</Th>}
              <Th right>Vol</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-2 py-6 text-center text-term-dim">
                  Loading market data…
                </td>
              </tr>
            )}
            {rows.map((q) => (
              <Row
                key={q.symbol}
                q={q}
                tick={ticks[q.symbol]}
                updatedAt={updatedAt}
                compact={compact}
                onClick={() => setActive(q.symbol, q.assetClass, "GP")}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  q,
  tick,
  updatedAt,
  compact,
  onClick,
}: {
  q: Quote;
  tick: "up" | "down" | "flat" | undefined;
  updatedAt: number;
  compact: boolean;
  onClick: () => void;
}) {
  const flash =
    tick === "up" ? "animate-flashGreen" : tick === "down" ? "animate-flashRed" : "";
  return (
    <tr
      onClick={onClick}
      className="grid-row hover:bg-term-border/40 cursor-pointer"
      title={`Open ${q.symbol} chart`}
    >
      <Td>
        <span className="text-term-amber font-bold">{q.symbol}</span>
      </Td>
      {!compact && <Td className="text-term-gray truncate max-w-[160px]">{q.name}</Td>}
      {/* key forces the flash animation to retrigger each tick */}
      <Td right>
        <span key={updatedAt} className={cn("inline-flex items-center gap-1 px-1", flash)}>
          {tick === "up" && <ArrowUp size={9} className="text-term-green" />}
          {tick === "down" && <ArrowDown size={9} className="text-term-red" />}
          <span className="text-term-white">{fmtPrice(q.last, q.assetClass)}</span>
        </span>
      </Td>
      {!compact && <Td right className="text-term-gray">{fmtPrice(q.bid, q.assetClass)}</Td>}
      {!compact && <Td right className="text-term-gray">{fmtPrice(q.ask, q.assetClass)}</Td>}
      <Td right className={colorForChange(q.change)}>{fmtChange(q.change)}</Td>
      <Td right className={colorForChange(q.change)}>{fmtPct(q.changePct)}</Td>
      {!compact && <Td right className="text-term-gray">{fmtPrice(q.high, q.assetClass)}</Td>}
      {!compact && <Td right className="text-term-gray">{fmtPrice(q.low, q.assetClass)}</Td>}
      <Td right className="text-term-dim">{fmtVolume(q.volume)}</Td>
    </tr>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "px-2 py-1 font-normal uppercase tracking-wide border-b border-term-border",
        right ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <td className={cn("px-2 py-[3px]", right ? "text-right" : "text-left", className)}>
      {children}
    </td>
  );
}
