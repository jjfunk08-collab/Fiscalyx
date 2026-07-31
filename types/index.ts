// ============================================================
//  Shared domain types for the terminal
// ============================================================

export type AssetClass =
  | "Equity"
  | "Crypto"
  | "FX"
  | "Commodity"
  | "Bond"
  | "Index";

// Bloomberg-style function codes the CLI understands.
export type FunctionCode =
  | "TOP" // market monitor (all)
  | "MON" // market monitor (all)
  | "GP" // graph price (chart)
  | "HP" // historical price
  | "DES" // description / fundamentals
  | "FA" // financial analysis
  | "NEWS"
  | "N"
  | "ECO" // economic calendar
  | "FRED"
  | "YCRV" // yield curve
  | "OMON" // options monitor
  | "HELP";

export type TickDirection = "up" | "down" | "flat";

export interface Instrument {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  sector?: string;
  basePrice: number;
}

export interface Quote {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  last: number;
  bid: number;
  ask: number;
  change: number; // absolute change vs previous close
  changePct: number; // percentage change
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  tick: TickDirection;
  updated: number; // epoch ms
}

export interface Candle {
  time: number; // unix seconds (lightweight-charts UTCTimestamp)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "1D" | "1W" | "1M" | "1Y" | "5Y" | "MAX";

export type Sentiment = "Bullish" | "Bearish" | "Neutral";

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  category: "Macro" | "Equity" | "Crypto" | "Commodity" | "CentralBank" | "FX";
  tickers: string[];
  sentiment: Sentiment;
  score: number; // -1..1
  time: number; // epoch ms
  body: string;
}

export interface EconEvent {
  id: string;
  time: number; // epoch ms
  country: string;
  event: string;
  importance: "Low" | "Medium" | "High";
  actual: string | null;
  forecast: string;
  previous: string;
}

export interface YieldPoint {
  tenor: string; // "1M", "2Y", "10Y", ...
  months: number;
  yield: number; // percent
  changeBp: number; // day change in basis points
}

export interface Fundamentals {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  marketCap: number;
  peRatio: number;
  eps: number;
  evEbitda: number;
  dividendYield: number;
  beta: number;
  week52High: number;
  week52Low: number;
  income: FinancialRow[];
  balance: FinancialRow[];
  cashflow: FinancialRow[];
}

export interface FinancialRow {
  label: string;
  values: number[]; // most-recent-first, in millions
}

export interface OptionRow {
  strike: number;
  callBid: number;
  callAsk: number;
  callIv: number; // implied vol %
  callOi: number; // open interest
  callVol: number;
  putBid: number;
  putAsk: number;
  putIv: number;
  putOi: number;
  putVol: number;
}

export interface OptionsChain {
  symbol: string;
  spot: number;
  expiry: string;
  rows: OptionRow[];
}

// Parsed CLI command.
export interface ParsedCommand {
  symbol: string | null;
  assetClass: AssetClass | null;
  fn: FunctionCode;
  raw: string;
}
