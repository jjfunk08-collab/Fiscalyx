// ============================================================
//  REAL-TIME FEED LAYER
//
//  NOTE ON TRANSPORT: Vercel's serverless/edge runtime cannot
//  hold a long-lived WebSocket server, so a raw `ws` server would
//  break on deploy. This module therefore implements the same
//  subscribe/unsubscribe contract over a 1–5s POLLING loop (the
//  spec's sanctioned fallback), with an optional Server-Sent
//  Events path if you later add a streaming route/edge worker.
//
//  Swap `createLiveFeed` internals for a native WebSocket client
//  if you deploy the terminal on a stateful host (Railway, Fly,
//  a VPS, etc.) — the public API here stays identical.
// ============================================================

import type { Quote } from "@/types";
import { getQuotes } from "@/lib/api";

export interface LiveFeedOptions {
  intervalMs?: number; // poll cadence (1000–5000 recommended)
  onQuotes: (quotes: Quote[]) => void;
  onError?: (err: unknown) => void;
}

export interface LiveFeedHandle {
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Start a live quote feed. Returns a handle to stop it.
 * Uses visibility-aware polling so background tabs don't burn quota.
 */
export function createLiveFeed(opts: LiveFeedOptions): LiveFeedHandle {
  const interval = clamp(opts.intervalMs ?? 2000, 500, 10_000);
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  let inFlight = false;

  const poll = async () => {
    if (inFlight || stopped) return;
    if (typeof document !== "undefined" && document.hidden) return;
    inFlight = true;
    try {
      const quotes = await getQuotes();
      if (!stopped) opts.onQuotes(quotes);
    } catch (err) {
      opts.onError?.(err);
    } finally {
      inFlight = false;
    }
  };

  // Fire immediately, then on cadence.
  void poll();
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
