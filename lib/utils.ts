// ============================================================
//  UI utilities: className merge + number/price/time formatters
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AssetClass } from "@/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Price formatting scaled to the asset class / magnitude. */
export function fmtPrice(n: number, assetClass?: AssetClass): string {
  if (!isFinite(n)) return "—";
  if (assetClass === "FX") return n.toFixed(4);
  if (assetClass === "Bond") return n.toFixed(2) + "%";
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function fmtChange(n: number): string {
  const s = n >= 0 ? "+" : "";
  return s + n.toFixed(2);
}

export function fmtPct(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

export function fmtVolume(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}

/** Market cap / statement values arrive in $millions. */
export function fmtMillions(n: number): string {
  const neg = n < 0;
  const a = Math.abs(n);
  let out: string;
  if (a >= 1e6) out = (a / 1e6).toFixed(2) + "T";
  else if (a >= 1e3) out = (a / 1e3).toFixed(2) + "B";
  else out = a.toFixed(0) + "M";
  return (neg ? "(" + out + ")" : out);
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function colorForChange(n: number): string {
  if (n > 0) return "text-term-green";
  if (n < 0) return "text-term-red";
  return "text-term-gray";
}
