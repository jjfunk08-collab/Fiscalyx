// ============================================================
//  GLOBAL TERMINAL STATE (Zustand)
//  Holds command-line text, the active asset context, the active
//  function/panel, command history, and UI toggles.
// ============================================================

import { create } from "zustand";
import type {
  AssetClass,
  FunctionCode,
  ParsedCommand,
} from "@/types";
import { findInstrument } from "@/lib/mock";

// Recognized function codes and their aliases.
export const FUNCTION_CODES: Record<string, FunctionCode> = {
  TOP: "TOP",
  MON: "MON",
  GP: "GP",
  HP: "HP",
  DES: "DES",
  FA: "FA",
  NEWS: "NEWS",
  N: "NEWS",
  ECO: "ECO",
  FRED: "ECO",
  YCRV: "YCRV",
  OMON: "OMON",
  HELP: "HELP",
};

export const FUNCTION_LABELS: Record<FunctionCode, string> = {
  TOP: "Market Monitor",
  MON: "Market Monitor",
  GP: "Price Graph",
  HP: "Historical Price",
  DES: "Description",
  FA: "Financial Analysis",
  NEWS: "News",
  N: "News",
  ECO: "Economic Calendar",
  FRED: "Economic Calendar",
  YCRV: "Yield Curve",
  OMON: "Options Monitor",
  HELP: "Help",
};

const ASSET_CLASSES: AssetClass[] = [
  "Equity",
  "Crypto",
  "FX",
  "Commodity",
  "Bond",
  "Index",
];

const ASSET_ALIASES: Record<string, AssetClass> = {
  EQUITY: "Equity",
  EQ: "Equity",
  US: "Equity",
  STOCK: "Equity",
  CRYPTO: "Crypto",
  FX: "FX",
  CURNCY: "FX",
  CURRENCY: "FX",
  COMMODITY: "Commodity",
  CMDTY: "Commodity",
  COMDTY: "Commodity",
  BOND: "Bond",
  GOVT: "Bond",
  INDEX: "Index",
  INDX: "Index",
};

/**
 * Parse a Bloomberg-style command:
 *   <TICKER> [ASSET_CLASS] <FUNCTION> [GO]
 * e.g. "AAPL US Equity GP", "BTC Crypto DES", "US10Y Bond YCRV",
 *      "TOP", "NEWS", "AAPL GP"
 */
export function parseCommand(raw: string): ParsedCommand | null {
  const cleaned = raw.trim().replace(/\s+GO\s*$/i, "").trim();
  if (!cleaned) return null;
  const tokens = cleaned.split(/\s+/);

  let fn: FunctionCode | null = null;
  let assetClass: AssetClass | null = null;
  let symbol: string | null = null;

  for (const tok of tokens) {
    const up = tok.toUpperCase();
    if (!fn && FUNCTION_CODES[up]) {
      fn = FUNCTION_CODES[up];
      continue;
    }
    if (!assetClass && ASSET_ALIASES[up]) {
      assetClass = ASSET_ALIASES[up];
      continue;
    }
    if (!symbol) {
      symbol = up;
    }
  }

  // A bare function (TOP / NEWS / ECO / YCRV / HELP) is valid with no symbol.
  if (!fn) {
    // If only a symbol was given, default to the description page.
    if (symbol) fn = "DES";
    else return null;
  }

  // Resolve asset class from the instrument if not explicitly given.
  if (symbol && !assetClass) {
    const inst = findInstrument(symbol);
    if (inst) assetClass = inst.assetClass;
  }

  return { symbol, assetClass, fn, raw: cleaned };
}

export interface TerminalState {
  commandInput: string;
  activeSymbol: string;
  activeAssetClass: AssetClass;
  activeFunction: FunctionCode;
  history: string[];
  historyIndex: number; // for up/down recall; -1 = not browsing
  soundEnabled: boolean;
  helpOpen: boolean;

  setCommandInput: (v: string) => void;
  execute: (raw?: string) => boolean; // returns true if a valid command ran
  setActive: (symbol: string, assetClass: AssetClass, fn: FunctionCode) => void;
  goFunction: (fn: FunctionCode) => void;
  recallHistory: (dir: 1 | -1) => void;
  toggleSound: () => void;
  setHelpOpen: (v: boolean) => void;
}

export const useTerminal = create<TerminalState>((set, get) => ({
  commandInput: "",
  activeSymbol: "AAPL",
  activeAssetClass: "Equity",
  activeFunction: "TOP",
  history: [],
  historyIndex: -1,
  soundEnabled: false,
  helpOpen: false,

  setCommandInput: (v) => set({ commandInput: v }),

  execute: (raw) => {
    const text = (raw ?? get().commandInput).trim();
    const parsed = parseCommand(text);
    if (!parsed) {
      set({ helpOpen: true });
      return false;
    }
    const symbol = parsed.symbol ?? get().activeSymbol;
    const assetClass = parsed.assetClass ?? get().activeAssetClass;
    const fn = parsed.fn;

    set((s) => ({
      activeSymbol: symbol,
      activeAssetClass: assetClass,
      activeFunction: fn,
      helpOpen: fn === "HELP",
      commandInput: "",
      historyIndex: -1,
      history: text ? [text, ...s.history.filter((h) => h !== text)].slice(0, 50) : s.history,
    }));
    return true;
  },

  setActive: (symbol, assetClass, fn) =>
    set({ activeSymbol: symbol, activeAssetClass: assetClass, activeFunction: fn }),

  goFunction: (fn) => set({ activeFunction: fn, helpOpen: fn === "HELP" }),

  recallHistory: (dir) =>
    set((s) => {
      if (s.history.length === 0) return s;
      let idx = s.historyIndex + dir;
      idx = Math.max(-1, Math.min(s.history.length - 1, idx));
      return {
        historyIndex: idx,
        commandInput: idx === -1 ? "" : s.history[idx],
      };
    }),

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  setHelpOpen: (v) => set({ helpOpen: v }),
}));

export { ASSET_CLASSES };
