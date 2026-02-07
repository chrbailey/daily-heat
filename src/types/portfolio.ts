export interface Position {
  ticker: string;
  shares: number;
  costBasis: number; // per share
}

export interface Portfolio {
  positions: Position[];
  customTickers: string[]; // user-added tickers beyond defaults
}
