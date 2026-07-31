"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type CandlestickData,
  type LineData,
  type HistogramData,
} from "lightweight-charts";
import { Download } from "lucide-react";
import { useLive } from "@/components/LiveProvider";
import { getHistory } from "@/lib/api";
import type { Candle, Timeframe } from "@/types";
import { cn, fmtPrice, fmtChange, fmtPct, colorForChange } from "@/lib/utils";

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "1Y", "5Y", "MAX"];

const COLORS = {
  bg: "#000000",
  grid: "#141414",
  border: "#1c1c1c",
  text: "#8a8a8a",
  green: "#00FF66",
  red: "#FF3336",
  sma20: "#00E5FF",
  sma50: "#FFB000",
  sma200: "#b070ff",
};

function sma(candles: Candle[], period: number): LineData[] {
  const out: LineData[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time as UTCTimestamp, value: sum / period });
    }
  }
  return out;
}

export default function ChartView({ symbol }: { symbol: string }) {
  const { quoteMap } = useLive();
  const quote = quoteMap[symbol];
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma200Ref = useRef<ISeriesApi<"Line"> | null>(null);

  const [tf, setTf] = useState<Timeframe>("1Y");
  const [showSma, setShowSma] = useState(true);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        fontFamily: "var(--font-mono), monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const candle = chart.addCandlestickSeries({
      upColor: COLORS.green,
      downColor: COLORS.red,
      wickUpColor: COLORS.green,
      wickDownColor: COLORS.red,
      borderVisible: false,
    });

    const vol = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      color: "#333333",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const mk = (color: string) =>
      chart.addLineSeries({
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;
    sma20Ref.current = mk(COLORS.sma20);
    sma50Ref.current = mk(COLORS.sma50);
    sma200Ref.current = mk(COLORS.sma200);

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Load data on symbol / timeframe change.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getHistory(symbol, tf).then((data) => {
      if (!alive) return;
      setCandles(data);
      setLoading(false);

      candleRef.current?.setData(
        data.map<CandlestickData>((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      volRef.current?.setData(
        data.map<HistogramData>((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? "rgba(0,255,102,0.35)" : "rgba(255,51,54,0.35)",
        }))
      );
      sma20Ref.current?.setData(sma(data, 20));
      sma50Ref.current?.setData(sma(data, 50));
      sma200Ref.current?.setData(sma(data, 200));
      chartRef.current?.timeScale().fitContent();
    });
    return () => {
      alive = false;
    };
  }, [symbol, tf]);

  // Toggle SMA visibility.
  useEffect(() => {
    [sma20Ref, sma50Ref, sma200Ref].forEach((r) =>
      r.current?.applyOptions({ visible: showSma })
    );
  }, [showSma]);

  const exportCsv = () => {
    const header = "time,date,open,high,low,close,volume\n";
    const body = candles
      .map((c) => {
        const d = new Date(c.time * 1000).toISOString();
        return `${c.time},${d},${c.open},${c.high},${c.low},${c.close},${c.volume}`;
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}_${tf}_history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="text-term-amber font-bold">{symbol}</span>
          {quote && (
            <span className="flex items-center gap-2 text-[11px]">
              <span className="text-term-white">{fmtPrice(quote.last, quote.assetClass)}</span>
              <span className={colorForChange(quote.change)}>
                {fmtChange(quote.change)} ({fmtPct(quote.changePct)})
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cn("tab", tf === t && "tab-active")}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setShowSma((v) => !v)}
            className={cn("tab", showSma && "text-term-cyan")}
            title="Toggle moving averages"
          >
            SMA
          </button>
          <button onClick={exportCsv} className="tab flex items-center gap-1" title="Export CSV">
            <Download size={11} /> CSV
          </button>
        </div>
      </div>

      <div className="panel-body relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-term-dim text-xs z-10">
            Loading {symbol} {tf}…
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-2 py-1 border-t border-term-border text-[10px] text-term-gray">
        <Legend color={COLORS.sma20} label="SMA 20" />
        <Legend color={COLORS.sma50} label="SMA 50" />
        <Legend color={COLORS.sma200} label="SMA 200" />
        <span className="ml-auto text-term-dim">{candles.length} bars · {tf}</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
