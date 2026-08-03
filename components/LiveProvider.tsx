"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Quote, TickDirection } from "@/types";
import { createLiveFeed } from "@/lib/websocket";
import { toQuoteMap } from "@/lib/api";
import { useTerminal } from "@/lib/store";

interface LiveContextValue {
  quotes: Quote[];
  quoteMap: Record<string, Quote>;
  ticks: Record<string, TickDirection>; // per-symbol last-move direction for flashing
  updatedAt: number;
  error: string | null;
  loaded: boolean; // true once the first poll has returned
  source: string | null;
}

const LiveContext = createContext<LiveContextValue>({
  quotes: [],
  quoteMap: {},
  ticks: {},
  updatedAt: 0,
  error: null,
  loaded: false,
  source: null,
});

export function useLive() {
  return useContext(LiveContext);
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [ticks, setTicks] = useState<Record<string, TickDirection>>({});
  const [updatedAt, setUpdatedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const prevRef = useRef<Record<string, number>>({});
  const soundEnabled = useTerminal((s) => s.soundEnabled);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const feed = createLiveFeed({
      intervalMs: 12000,
      onResult: ({ quotes: next, error: err, source: src }) => {
        setLoaded(true);
        setError(err);
        if (src) setSource(src);

        // Keep the last good snapshot if a poll transiently returns nothing.
        if (next.length === 0) return;

        const prev = prevRef.current;
        const nextTicks: Record<string, TickDirection> = {};
        let biggestMove = 0;

        for (const q of next) {
          const p = prev[q.symbol];
          if (p == null) nextTicks[q.symbol] = "flat";
          else if (q.last > p) nextTicks[q.symbol] = "up";
          else if (q.last < p) nextTicks[q.symbol] = "down";
          else nextTicks[q.symbol] = "flat";
          prev[q.symbol] = q.last;
          biggestMove = Math.max(biggestMove, Math.abs(q.changePct));
        }

        prevRef.current = prev;
        setQuotes(next);
        setTicks(nextTicks);
        setUpdatedAt(Date.now());

        if (soundEnabled && biggestMove > 2.5) ping(audioRef);
      },
    });
    return () => feed.stop();
    // Re-create the feed when sound toggles so the closure sees the flag.
  }, [soundEnabled]);

  const quoteMap = useMemo(() => toQuoteMap(quotes), [quotes]);

  const value = useMemo(
    () => ({ quotes, quoteMap, ticks, updatedAt, error, loaded, source }),
    [quotes, quoteMap, ticks, updatedAt, error, loaded, source]
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

// Subdued retro ping using the Web Audio API.
function ping(ref: React.MutableRefObject<AudioContext | null>) {
  try {
    if (!ref.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ref.current = new Ctx();
    }
    const ctx = ref.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    /* audio not available */
  }
}
