"use client";

import { useEffect, useState } from "react";
import { getOptions } from "@/lib/api";
import { useLive } from "@/components/LiveProvider";
import type { OptionsChain as OChain } from "@/types";
import { cn, fmtVolume } from "@/lib/utils";

interface State {
  loading: boolean;
  available: boolean;
  reason?: string;
  chain?: OChain;
}

export default function OptionsChain({ symbol }: { symbol: string }) {
  const { quoteMap } = useLive();
  const q = quoteMap[symbol];
  const [state, setState] = useState<State>({ loading: true, available: false });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, available: false });
    getOptions(symbol).then((res) => {
      if (!alive) return;
      setState({
        loading: false,
        available: res.available,
        reason: res.reason || res.error || undefined,
        chain: res.chain,
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
          <span>Options Monitor — {symbol}</span>
        </div>
        <div className="panel-body flex items-center justify-center text-term-dim text-xs">
          Loading options chain for {symbol}…
        </div>
      </div>
    );
  }

  if (!state.available || !state.chain || state.chain.rows.length === 0) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span>Options Monitor — {symbol}</span>
        </div>
        <div className="panel-body flex flex-col items-center justify-center gap-1">
          <span className="text-term-red text-sm">No Data Available</span>
          <span className="text-term-dim text-[10px] max-w-[420px] text-center">
            {state.reason || `Options not available for ${symbol}.`}
          </span>
        </div>
      </div>
    );
  }

  const chain = state.chain;
  const spot = q?.last ?? chain.spot;

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>Options Monitor — {chain.symbol}</span>
        <span className="flex gap-3 text-[10px]">
          <span className="text-term-gray">
            Spot <span className="text-term-white">{spot.toFixed(2)}</span>
          </span>
          <span className="text-term-cyan">Exp {chain.expiry}</span>
        </span>
      </div>

      <div className="panel-body">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-term-bg z-10">
            <tr className="text-term-green">
              <th className="py-1 text-right px-2 font-normal">Vol</th>
              <th className="py-1 text-right px-2 font-normal">OI</th>
              <th className="py-1 text-right px-2 font-normal">IV</th>
              <th className="py-1 text-right px-2 font-normal">Bid</th>
              <th className="py-1 text-right px-2 font-normal">Ask</th>
              <th className="py-1 text-center px-2 font-bold text-term-amber bg-term-panel">STRIKE</th>
              <th className="py-1 text-left px-2 font-normal text-term-red">Bid</th>
              <th className="py-1 text-left px-2 font-normal text-term-red">Ask</th>
              <th className="py-1 text-left px-2 font-normal text-term-red">IV</th>
              <th className="py-1 text-left px-2 font-normal text-term-red">OI</th>
              <th className="py-1 text-left px-2 font-normal text-term-red">Vol</th>
            </tr>
            <tr className="text-term-dim text-[9px]">
              <th colSpan={5} className="py-0.5 text-center font-normal border-b border-term-border">
                CALLS
              </th>
              <th className="border-b border-term-border" />
              <th colSpan={5} className="py-0.5 text-center font-normal border-b border-term-border">
                PUTS
              </th>
            </tr>
          </thead>
          <tbody>
            {chain.rows.map((r) => {
              const step =
                chain.rows.length > 1
                  ? Math.abs(chain.rows[1].strike - chain.rows[0].strike)
                  : Math.max(0.01, spot * 0.02);
              const isAtm = Math.abs(r.strike - spot) < step / 2;
              const itmCall = r.strike < spot;
              const itmPut = r.strike > spot;
              return (
                <tr key={r.strike} className={cn("grid-row", isAtm && "bg-term-amber/10")}>
                  <td className="py-0.5 px-2 text-right text-term-dim">{fmtVolume(r.callVol)}</td>
                  <td className="py-0.5 px-2 text-right text-term-dim">{fmtVolume(r.callOi)}</td>
                  <td className="py-0.5 px-2 text-right text-term-cyan">{r.callIv.toFixed(1)}%</td>
                  <td className={cn("py-0.5 px-2 text-right", itmCall ? "text-term-green" : "text-term-gray")}>
                    {r.callBid.toFixed(2)}
                  </td>
                  <td className={cn("py-0.5 px-2 text-right", itmCall ? "text-term-green" : "text-term-gray")}>
                    {r.callAsk.toFixed(2)}
                  </td>
                  <td className="py-0.5 px-2 text-center font-bold text-term-amber bg-term-panel">
                    {r.strike}
                  </td>
                  <td className={cn("py-0.5 px-2 text-left", itmPut ? "text-term-red" : "text-term-gray")}>
                    {r.putBid.toFixed(2)}
                  </td>
                  <td className={cn("py-0.5 px-2 text-left", itmPut ? "text-term-red" : "text-term-gray")}>
                    {r.putAsk.toFixed(2)}
                  </td>
                  <td className="py-0.5 px-2 text-left text-term-cyan">{r.putIv.toFixed(1)}%</td>
                  <td className="py-0.5 px-2 text-left text-term-dim">{fmtVolume(r.putOi)}</td>
                  <td className="py-0.5 px-2 text-left text-term-dim">{fmtVolume(r.putVol)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[9px] text-term-dim p-2">
          Nearest expiry · source: Yahoo Finance. ATM row highlighted.
        </p>
      </div>
    </div>
  );
}
