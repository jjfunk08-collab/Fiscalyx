// ============================================================
//  INSTRUMENT REGISTRY
//  Pure, static mapping of the terminal's internal symbols to
//  their live-provider identifiers:
//    • Yahoo Finance ticker  (equities, indices, FX, commodities, rates)
//    • CoinGecko id          (crypto)
//  No data is generated here — this is only a lookup table.
// ============================================================

import type { AssetClass, Instrument } from "@/types";

export const ASSET_CLASSES: AssetClass[] = [
  "Equity",
  "Crypto",
  "FX",
  "Commodity",
  "Bond",
  "Index",
];

export const UNIVERSE: Instrument[] = [
  // ---- Equities (Yahoo ticker == symbol) ----
  { symbol: "AAPL", name: "Apple Inc", assetClass: "Equity", currency: "USD", sector: "Technology", yahoo: "AAPL" },
  { symbol: "MSFT", name: "Microsoft Corp", assetClass: "Equity", currency: "USD", sector: "Technology", yahoo: "MSFT" },
  { symbol: "NVDA", name: "NVIDIA Corp", assetClass: "Equity", currency: "USD", sector: "Semiconductors", yahoo: "NVDA" },
  { symbol: "AMZN", name: "Amazon.com Inc", assetClass: "Equity", currency: "USD", sector: "Consumer Disc", yahoo: "AMZN" },
  { symbol: "GOOGL", name: "Alphabet Inc", assetClass: "Equity", currency: "USD", sector: "Communication", yahoo: "GOOGL" },
  { symbol: "META", name: "Meta Platforms", assetClass: "Equity", currency: "USD", sector: "Communication", yahoo: "META" },
  { symbol: "TSLA", name: "Tesla Inc", assetClass: "Equity", currency: "USD", sector: "Auto", yahoo: "TSLA" },
  { symbol: "JPM", name: "JPMorgan Chase", assetClass: "Equity", currency: "USD", sector: "Financials", yahoo: "JPM" },
  { symbol: "BHVN", name: "Biohaven Ltd", assetClass: "Equity", currency: "USD", sector: "Biotech", yahoo: "BHVN" },
  { symbol: "XOM", name: "Exxon Mobil Corp", assetClass: "Equity", currency: "USD", sector: "Energy", yahoo: "XOM" },

  // ---- Indices ----
  { symbol: "SPX", name: "S&P 500 Index", assetClass: "Index", currency: "USD", yahoo: "^GSPC" },
  { symbol: "NDX", name: "Nasdaq 100 Index", assetClass: "Index", currency: "USD", yahoo: "^NDX" },
  { symbol: "DJI", name: "Dow Jones Ind Avg", assetClass: "Index", currency: "USD", yahoo: "^DJI" },
  { symbol: "VIX", name: "CBOE Volatility Idx", assetClass: "Index", currency: "USD", yahoo: "^VIX" },
  { symbol: "UKX", name: "FTSE 100 Index", assetClass: "Index", currency: "GBP", yahoo: "^FTSE" },
  { symbol: "DAX", name: "DAX 40 Index", assetClass: "Index", currency: "EUR", yahoo: "^GDAXI" },
  { symbol: "N225", name: "Nikkei 225", assetClass: "Index", currency: "JPY", yahoo: "^N225" },

  // ---- FX (Yahoo pairs use the =X suffix) ----
  { symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "FX", currency: "USD", yahoo: "EURUSD=X" },
  { symbol: "GBPUSD", name: "Pound / US Dollar", assetClass: "FX", currency: "USD", yahoo: "GBPUSD=X" },
  { symbol: "USDJPY", name: "US Dollar / Yen", assetClass: "FX", currency: "JPY", yahoo: "USDJPY=X" },
  { symbol: "USDCHF", name: "US Dollar / Franc", assetClass: "FX", currency: "CHF", yahoo: "USDCHF=X" },
  { symbol: "AUDUSD", name: "Aussie / US Dollar", assetClass: "FX", currency: "USD", yahoo: "AUDUSD=X" },
  { symbol: "USDCAD", name: "US Dollar / Loonie", assetClass: "FX", currency: "CAD", yahoo: "USDCAD=X" },

  // ---- Commodities (Yahoo futures use the =F suffix) ----
  { symbol: "GOLD", name: "Gold Futures / oz", assetClass: "Commodity", currency: "USD", yahoo: "GC=F" },
  { symbol: "SILVER", name: "Silver Futures / oz", assetClass: "Commodity", currency: "USD", yahoo: "SI=F" },
  { symbol: "OIL", name: "WTI Crude / bbl", assetClass: "Commodity", currency: "USD", yahoo: "CL=F" },
  { symbol: "BRENT", name: "Brent Crude / bbl", assetClass: "Commodity", currency: "USD", yahoo: "BZ=F" },
  { symbol: "NATGAS", name: "Natural Gas / MMBtu", assetClass: "Commodity", currency: "USD", yahoo: "NG=F" },
  { symbol: "COPPER", name: "Copper / lb", assetClass: "Commodity", currency: "USD", yahoo: "HG=F" },
  { symbol: "CORN", name: "Corn / bu", assetClass: "Commodity", currency: "USD", yahoo: "ZC=F" },
  { symbol: "WHEAT", name: "Wheat / bu", assetClass: "Commodity", currency: "USD", yahoo: "ZW=F" },

  // ---- Crypto (CoinGecko ids) ----
  { symbol: "BTC", name: "Bitcoin", assetClass: "Crypto", currency: "USD", coingeckoId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", assetClass: "Crypto", currency: "USD", coingeckoId: "ethereum" },
  { symbol: "SOL", name: "Solana", assetClass: "Crypto", currency: "USD", coingeckoId: "solana" },
  { symbol: "XRP", name: "Ripple", assetClass: "Crypto", currency: "USD", coingeckoId: "ripple" },
  { symbol: "DOGE", name: "Dogecoin", assetClass: "Crypto", currency: "USD", coingeckoId: "dogecoin" },
  { symbol: "ADA", name: "Cardano", assetClass: "Crypto", currency: "USD", coingeckoId: "cardano" },
  { symbol: "BNB", name: "BNB", assetClass: "Crypto", currency: "USD", coingeckoId: "binancecoin" },
  { symbol: "AVAX", name: "Avalanche", assetClass: "Crypto", currency: "USD", coingeckoId: "avalanche-2" },

  // ---- US Treasury rates (Yahoo CBOE yield indices; quoted as yield %) ----
  { symbol: "US13W", name: "US 13W T-Bill Yield", assetClass: "Bond", currency: "USD", yahoo: "^IRX" },
  { symbol: "US5Y", name: "US 5Y Treasury Yield", assetClass: "Bond", currency: "USD", yahoo: "^FVX" },
  { symbol: "US10Y", name: "US 10Y Treasury Yield", assetClass: "Bond", currency: "USD", yahoo: "^TNX" },
  { symbol: "US30Y", name: "US 30Y Treasury Yield", assetClass: "Bond", currency: "USD", yahoo: "^TYX" },
];

// ---- Twelve Data symbol mapping ----
// Confident: equities (plain ticker), FX (slash pairs), gold/silver (metal pairs).
// Best-effort: major indices + WTI (Twelve Data free-tier coverage varies, so
// the history route always falls back to Yahoo if Twelve Data returns nothing).
const TWELVEDATA: Record<string, string> = {
  // FX
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCHF: "USD/CHF",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  // Metals / energy (best-effort for oil)
  GOLD: "XAU/USD",
  SILVER: "XAG/USD",
  OIL: "WTI/USD",
  // Indices (best-effort)
  SPX: "SPX",
  NDX: "NDX",
  DJI: "DJI",
  VIX: "VIX",
};
for (const inst of UNIVERSE) {
  if (inst.assetClass === "Equity") inst.twelvedata = inst.symbol;
  else if (TWELVEDATA[inst.symbol]) inst.twelvedata = TWELVEDATA[inst.symbol];
}

// ---- ETF proxies ----
// Raw index & futures data is almost always paywalled (exchange licensing).
// Their ETF proxies are ordinary US-listed equities, fully covered by the
// free tiers (Finnhub quotes, Twelve Data charts), so we route these symbols
// through their proxy ticker across every provider. Prices track the
// underlying closely but aren't identical (expense drift, different scale),
// so the display name makes the proxy explicit.
const PROXY: Record<string, { etf: string; name: string }> = {
  // Indices
  SPX: { etf: "SPY", name: "S&P 500 (SPY ETF)" },
  NDX: { etf: "QQQ", name: "Nasdaq 100 (QQQ ETF)" },
  DJI: { etf: "DIA", name: "Dow Jones (DIA ETF)" },
  VIX: { etf: "VIXY", name: "Volatility (VIXY ETF)" },
  UKX: { etf: "EWU", name: "FTSE 100 (EWU ETF)" },
  DAX: { etf: "EWG", name: "DAX (EWG ETF)" },
  N225: { etf: "EWJ", name: "Nikkei 225 (EWJ ETF)" },
  // Commodities
  GOLD: { etf: "GLD", name: "Gold (GLD ETF)" },
  SILVER: { etf: "SLV", name: "Silver (SLV ETF)" },
  OIL: { etf: "USO", name: "WTI Crude (USO ETF)" },
  BRENT: { etf: "BNO", name: "Brent Crude (BNO ETF)" },
  NATGAS: { etf: "UNG", name: "Nat Gas (UNG ETF)" },
  COPPER: { etf: "CPER", name: "Copper (CPER ETF)" },
  CORN: { etf: "CORN", name: "Corn (CORN ETF)" },
  WHEAT: { etf: "WEAT", name: "Wheat (WEAT ETF)" },
};
for (const inst of UNIVERSE) {
  const p = PROXY[inst.symbol];
  if (!p) continue;
  inst.etf = p.etf;
  inst.name = p.name;
  inst.yahoo = p.etf; // ETFs resolve on Yahoo too
  inst.twelvedata = p.etf; // and on Twelve Data (US equities are free-tier)
}

const BY_SYMBOL = new Map(UNIVERSE.map((i) => [i.symbol, i]));
const BY_YAHOO = new Map(UNIVERSE.filter((i) => i.yahoo).map((i) => [i.yahoo as string, i]));
const BY_CG = new Map(UNIVERSE.filter((i) => i.coingeckoId).map((i) => [i.coingeckoId as string, i]));

export function findInstrument(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol.toUpperCase());
}

export function instrumentByYahoo(yahoo: string): Instrument | undefined {
  return BY_YAHOO.get(yahoo);
}

export function instrumentByCoingecko(id: string): Instrument | undefined {
  return BY_CG.get(id);
}

export function instrumentsByClass(assetClass: AssetClass): Instrument[] {
  return UNIVERSE.filter((i) => i.assetClass === assetClass);
}

/**
 * Resolve a possibly-unknown symbol to something we can query. Known
 * symbols map to their registry entry; an unknown symbol is treated as a
 * raw Yahoo equity ticker so the search box can look up arbitrary names.
 */
export function resolveForQuery(symbol: string): {
  instrument?: Instrument;
  yahoo?: string;
  coingeckoId?: string;
  twelvedata?: string;
  assetClass: AssetClass;
  name: string;
  currency: string;
} {
  const inst = findInstrument(symbol);
  if (inst) {
    return {
      instrument: inst,
      yahoo: inst.yahoo,
      coingeckoId: inst.coingeckoId,
      twelvedata: inst.twelvedata,
      assetClass: inst.assetClass,
      name: inst.name,
      currency: inst.currency,
    };
  }
  const raw = symbol.toUpperCase();
  // Unknown symbol → treat as a raw US equity ticker on both providers.
  return { yahoo: raw, twelvedata: raw, assetClass: "Equity", name: raw, currency: "USD" };
}
