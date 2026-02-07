// Tradier API response types
// Docs: https://docs.tradier.com/reference/brokerage-api-markets-get-options-chains

export interface TradierQuote {
  symbol: string;
  description: string;
  last: number;
  change: number;
  change_percentage: number;
  volume: number;
  average_volume: number;
  open: number;
  high: number;
  low: number;
  close: number; // previous close
  bid: number;
  ask: number;
  week_52_high: number;
  week_52_low: number;
}

export interface TradierGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  phi: number;
  bid_iv: number;
  mid_iv: number;
  ask_iv: number;
  smv_vol: number; // smoothed market value volatility
  updated_at: string;
}

export interface TradierOptionContract {
  symbol: string; // OCC symbol e.g. AAPL250207C00200000
  description: string;
  exch: string;
  type: 'call' | 'put';
  strike: number;
  expiration_date: string; // YYYY-MM-DD
  bid: number;
  ask: number;
  last: number;
  volume: number;
  open_interest: number;
  underlying: string;
  greeks?: TradierGreeks;
}

export interface TradierQuotesResponse {
  quotes: {
    quote: TradierQuote | TradierQuote[];
  };
}

export interface TradierOptionsChainResponse {
  options: {
    option: TradierOptionContract[];
  } | null;
}

export interface TradierExpirationsResponse {
  expirations: {
    date: string[];
  } | null;
}
