"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Activity } from "lucide-react";
import { useLive } from "@/components/LiveProvider";
import { useTerminal, FUNCTION_LABELS } from "@/lib/store";
import { cn, fmtPrice, fmtPct, colorForChange } from "@/lib/utils";
import type { FunctionCode } from "@/types";

const TICKER_SYMBOLS = ["SPX", "NDX", "DJI", "VIX", "US10Y", "EURUSD", "GOLD", "OIL", "BTC", "ETH"];

export default function TerminalHeader() {
  const { quoteMap } = useLive();
  const soundEnabled = useTerminal((s) => s.soundEnabled);
  const toggleSound = useTerminal((s) => s.toggleSound);
  const activeFunction = useTerminal((s) => s.activeFunction);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const t = setInterval(() => {
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "America/New_York",
        })
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="border-b border-term-border bg-term-bg">
      {/* Brand row */}
      <div className="flex items-center justify-between px-3 h-9">
        <div className="flex items-center gap-3">
          <span className="text-term-amber font-bold tracking-widest text-sm">
            ▮ TERMINAL
          </span>
          <span className="hidden sm:inline text-[10px] text-term-dim uppercase tracking-widest">
            Multi-Asset Workstation
          </span>
          <span className="flex items-center gap-1 text-[10px] text-term-green">
            <Activity size={11} className="animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <FnKey label="F1" name="HELP" />
          <FnKey label="F2" name="TOP" />
          <FnKey label="F3" name="NEWS" />
          <button
            onClick={toggleSound}
            title="Toggle audio ticks"
            className={cn(
              "keycap flex items-center gap-1",
              soundEnabled ? "text-term-amber border-term-amber" : "text-term-gray"
            )}
          >
            {soundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
          </button>
          <span className="text-term-cyan text-xs tabular-nums">{clock}</span>
          <span className="text-[9px] text-term-dim">EST</span>
        </div>
      </div>

      {/* Scrolling index ticker strip */}
      <div className="h-6 overflow-hidden border-t border-term-border/60 bg-black">
        <div className="flex items-center gap-6 whitespace-nowrap animate-none px-3 h-6 text-[11px]">
          {TICKER_SYMBOLS.map((sym) => {
            const q = quoteMap[sym];
            if (!q) return null;
            return (
              <span key={sym} className="flex items-center gap-1.5">
                <span className="text-term-gray">{sym}</span>
                <span className="text-term-white">{fmtPrice(q.last, q.assetClass)}</span>
                <span className={colorForChange(q.change)}>{fmtPct(q.changePct)}</span>
              </span>
            );
          })}
          <span className="text-term-dim">
            &nbsp;· current view: {FUNCTION_LABELS[activeFunction]} ·
          </span>
        </div>
      </div>
    </header>
  );
}

function FnKey({ label, name }: { label: string; name: FunctionCode }) {
  const goFunction = useTerminal((s) => s.goFunction);
  return (
    <button className="keycap hover:text-term-amber" onClick={() => goFunction(name)}>
      {label}
    </button>
  );
}
