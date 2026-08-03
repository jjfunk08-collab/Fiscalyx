// ============================================================
//  REAL-TIME FEED LAYER (short-polling)
//
//  Vercel's serverless runtime can't hold a long-lived WebSocket
//  server, so this implements a simple visibility-aware POLLING
//  loop against /api/market (default every 6s — inside the 5–10s
//  window recommended for the free Yahoo/CoinGecko endpoints).
//
//  The public contract is unchanged if you later swap in a native
//  socket on a stateful host.
// ============================================================

import { getQuotes, type MarketResult } from "@/lib/api";

export interface LiveFeedOptions {
  intervalMs?: number; // poll cadence (5000–10000 recommended)
  symbols?: string[]; // optional subset; omitted = full universe
  onResult: (result: MarketResult) => void;
  onError?: (err: unknown) => void;
}

export interface LiveFeedHandle {
  stop: () => void;
  isRunning: () => boolean;
}

/** Start a live quote feed. Returns a handle to stop it. */
export function createLiveFeed(opts: LiveFeedOptions): LiveFeedHandle {
  const interval = clamp(opts.intervalMs ?? 6000, 3000, 30_000);
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  let inFlight = false;

  const poll = async () => {
    if (inFlight || stopped) return;
    if (typeof document !== "undefined" && document.hidden) return; // pause in background tabs
    inFlight = true;
    try {
      const result = await getQuotes(opts.symbols);
      if (!stopped) opts.onResult(result);
    } catch (err) {
      opts.onError?.(err);
    } finally {
      inFlight = false;
    }
  };

  void poll(); // fire immediately
  timer = setInterval(poll, interval);

  return {
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
    },
    isRunning() {
      return !stopped;
    },
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
