"use client";

import { useEffect } from "react";
import { LiveProvider, useLive } from "@/components/LiveProvider";
import TerminalHeader from "@/components/TerminalHeader";
import CommandBar from "@/components/CommandBar";
import MarketGrid from "@/components/MarketGrid";
import ChartView from "@/components/ChartView";
import FinancialsView from "@/components/FinancialsView";
import NewsFeed from "@/components/NewsFeed";
import YieldCurve from "@/components/YieldCurve";
import OptionsChain from "@/components/OptionsChain";
import HelpOverlay from "@/components/HelpOverlay";
import { useTerminal, FUNCTION_LABELS } from "@/lib/store";
import { fmtTime } from "@/lib/utils";

export default function Page() {
  return (
    <LiveProvider>
      <Workspace />
    </LiveProvider>
  );
}

function Workspace() {
  const activeFunction = useTerminal((s) => s.activeFunction);
  const activeSymbol = useTerminal((s) => s.activeSymbol);
  const goFunction = useTerminal((s) => s.goFunction);
  const setHelpOpen = useTerminal((s) => s.setHelpOpen);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        goFunction("HELP");
      } else if (e.key === "F2") {
        e.preventDefault();
        goFunction("TOP");
      } else if (e.key === "F3") {
        e.preventDefault();
        goFunction("NEWS");
      } else if (e.key === "Escape") {
        setHelpOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goFunction, setHelpOpen]);

  const isMonitor = activeFunction === "TOP" || activeFunction === "MON";
  const isNews = activeFunction === "NEWS" || activeFunction === "N";
  const symbolCentric = ["GP", "HP", "DES", "FA", "OMON"].includes(activeFunction);

  return (
    <div className="h-screen flex flex-col bg-term-bg text-term-white overflow-hidden">
      <TerminalHeader />
      <CommandBar />

      <main className="flex-1 min-h-0 p-1.5 gap-1.5 grid grid-cols-1 lg:grid-cols-[300px_1fr_340px]">
        {/* Left rail: always-on compact monitor (hidden when monitor is the main view) */}
        <div className={`min-h-0 hidden lg:block ${isMonitor ? "lg:hidden" : ""}`}>
          <MarketGrid compact />
        </div>

        {/* Center: active function */}
        <div className={`min-h-0 ${isMonitor ? "lg:col-span-2" : ""} ${isNews ? "lg:col-span-2" : ""}`}>
          <MainView fn={activeFunction} symbol={activeSymbol} />
        </div>

        {/* Right rail: contextual news (hidden when News is the main view) */}
        {!isNews && (
          <div className="min-h-0 hidden lg:block">
            <NewsFeed filterSymbol={symbolCentric ? activeSymbol : undefined} />
          </div>
        )}
      </main>

      <StatusBar />
      <HelpOverlay />
    </div>
  );
}

function MainView({ fn, symbol }: { fn: string; symbol: string }) {
  switch (fn) {
    case "TOP":
    case "MON":
      return <MarketGrid />;
    case "GP":
    case "HP":
      return <ChartView symbol={symbol} />;
    case "DES":
    case "FA":
      return <FinancialsView symbol={symbol} />;
    case "NEWS":
    case "N":
      return <NewsFeed />;
    case "ECO":
    case "FRED":
    case "YCRV":
      return <YieldCurve />;
    case "OMON":
      return <OptionsChain symbol={symbol} />;
    default:
      return <ChartView symbol={symbol} />;
  }
}

function StatusBar() {
  const { updatedAt, quotes, error, loaded } = useLive();
  const activeFunction = useTerminal((s) => s.activeFunction);
  const activeSymbol = useTerminal((s) => s.activeSymbol);

  const connected = quotes.length > 0;
  const statusColor = !loaded ? "text-term-amber" : connected ? "text-term-green" : "text-term-red";
  const statusLabel = !loaded ? "● CONNECTING" : connected ? "● LIVE" : "● OFFLINE";

  return (
    <footer className="h-6 shrink-0 border-t border-term-border bg-term-bg flex items-center justify-between px-3 text-[10px] text-term-dim">
      <div className="flex items-center gap-3">
        <span className={statusColor}>{statusLabel}</span>
        <span>
          {activeSymbol} · {FUNCTION_LABELS[activeFunction as keyof typeof FUNCTION_LABELS] ?? activeFunction}
        </span>
        <span className="hidden sm:inline">{quotes.length} instruments</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-term-cyan">Yahoo · CoinGecko</span>
        {error && <span className="text-term-red hidden sm:inline">feed degraded</span>}
        <span>upd {updatedAt ? fmtTime(updatedAt) : "--:--:--"}</span>
        <span className="hidden sm:inline">F1 Help</span>
      </div>
    </footer>
  );
}
