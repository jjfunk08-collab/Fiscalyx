"use client";

import { X } from "lucide-react";
import { useTerminal } from "@/lib/store";

const FUNCTIONS: { code: string; desc: string }[] = [
  { code: "TOP / MON", desc: "Multi-asset market monitor" },
  { code: "GP", desc: "Price graph (candlestick + MAs)" },
  { code: "HP", desc: "Historical price / CSV export" },
  { code: "DES / FA", desc: "Description & financial analysis" },
  { code: "NEWS / N", desc: "News & sentiment stream" },
  { code: "ECO / FRED", desc: "Economic calendar" },
  { code: "YCRV", desc: "Treasury yield curve" },
  { code: "OMON", desc: "Options chain monitor" },
  { code: "HELP", desc: "This screen" },
];

const EXAMPLES = [
  "AAPL US Equity GP",
  "BTC Crypto DES",
  "EURUSD FX GP",
  "US10Y Bond YCRV",
  "GOLD Commodity TOP",
  "NVDA OMON",
  "NEWS",
  "ECO",
];

export default function HelpOverlay() {
  const open = useTerminal((s) => s.helpOpen);
  const setHelpOpen = useTerminal((s) => s.setHelpOpen);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="w-full max-w-2xl border border-term-amber bg-term-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span>Help — Command Reference</span>
          <button onClick={() => setHelpOpen(false)} className="text-term-gray hover:text-term-amber">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-[12px]">
          <div>
            <div className="text-term-cyan uppercase text-[11px] tracking-wide mb-1">Syntax</div>
            <p className="text-term-gray">
              <span className="text-term-amber">&lt;TICKER&gt;</span>{" "}
              <span className="text-term-white">[ASSET CLASS]</span>{" "}
              <span className="text-term-green">&lt;FUNCTION&gt;</span>{" "}
              <span className="text-term-dim">[GO / Enter]</span>
            </p>
            <p className="text-term-dim text-[11px] mt-1">
              Asset class is optional — the terminal infers it from the ticker. A bare function
              (e.g. <span className="text-term-green">NEWS</span>) works with no ticker.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-term-cyan uppercase text-[11px] tracking-wide mb-1">Functions</div>
              <ul className="space-y-0.5">
                {FUNCTIONS.map((f) => (
                  <li key={f.code} className="flex gap-2">
                    <span className="text-term-amber w-24 shrink-0">{f.code}</span>
                    <span className="text-term-gray">{f.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-term-cyan uppercase text-[11px] tracking-wide mb-1">Examples</div>
              <ul className="space-y-0.5">
                {EXAMPLES.map((ex) => (
                  <li key={ex} className="text-term-white">
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="text-term-cyan uppercase text-[11px] tracking-wide mb-1">Shortcuts</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-term-gray">
              <span><span className="keycap">/</span> focus command line</span>
              <span><span className="keycap">Enter</span> run</span>
              <span><span className="keycap">Esc</span> clear / close</span>
              <span><span className="keycap">↑</span><span className="keycap">↓</span> history</span>
              <span><span className="keycap">F1</span> help</span>
              <span><span className="keycap">F2</span> monitor</span>
              <span><span className="keycap">F3</span> news</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
