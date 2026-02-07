// Fallback mock data when Yahoo Finance is unreachable
import type { TradierQuote, TradierOptionContract } from '@/types/tradier';

// Mock prices — approximate as of Feb 2026. Live data via Yahoo Finance.
const MOCK_PRICES: Record<string, { price: number; desc: string }> = {
  AAPL: { price: 236.50, desc: 'Apple Inc' },
  AMZN: { price: 238.40, desc: 'Amazon.com Inc' },
  AVGO: { price: 259.80, desc: 'Broadcom Inc' },
  GOOGL: { price: 204.40, desc: 'Alphabet Inc' },
  META: { price: 720.50, desc: 'Meta Platforms Inc' },
  MSFT: { price: 393.60, desc: 'Microsoft Corp' },
  NVDA: { price: 171.90, desc: 'NVIDIA Corp' },
  TSLA: { price: 397.20, desc: 'Tesla Inc' },
  IBIT: { price: 58.40, desc: 'iShares Bitcoin Trust' },
};

export function getMockQuotes(symbols: string[]): TradierQuote[] {
  return symbols.map((symbol) => {
    const info = MOCK_PRICES[symbol] ?? { price: 100, desc: symbol };
    const change = (Math.random() - 0.48) * info.price * 0.02;
    return {
      symbol,
      description: info.desc,
      last: +(info.price + change).toFixed(2),
      change: +change.toFixed(2),
      change_percentage: +((change / info.price) * 100).toFixed(2),
      volume: Math.floor(Math.random() * 50_000_000) + 5_000_000,
      average_volume: Math.floor(Math.random() * 40_000_000) + 10_000_000,
      open: +(info.price + (Math.random() - 0.5) * 2).toFixed(2),
      high: +(info.price + Math.random() * 3).toFixed(2),
      low: +(info.price - Math.random() * 3).toFixed(2),
      close: +info.price.toFixed(2),
      bid: +(info.price + change - 0.02).toFixed(2),
      ask: +(info.price + change + 0.02).toFixed(2),
      week_52_high: +(info.price * 1.35).toFixed(2),
      week_52_low: +(info.price * 0.65).toFixed(2),
    };
  });
}

export function getMockExpirations(symbol: string): string[] {
  // Generate next 8 M/W/F expirations (the new 0DTE schedule from the article)
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 30 && dates.length < 8; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const day = d.getDay();
    if (day === 1 || day === 3 || day === 5) {
      // Monday, Wednesday, Friday
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  return dates;
}

export function getMockOptionsChain(
  symbol: string,
  expiration: string,
): TradierOptionContract[] {
  const info = MOCK_PRICES[symbol] ?? { price: 100, desc: symbol };
  const price = info.price;
  const contracts: TradierOptionContract[] = [];

  // Generate strikes around current price
  const strikeStep = price > 500 ? 5 : price > 100 ? 2.5 : 1;
  const numStrikes = 15;

  for (let i = -numStrikes; i <= numStrikes; i++) {
    const strike = Math.round((price + i * strikeStep) * 100) / 100;
    if (strike <= 0) continue;

    for (const type of ['call', 'put'] as const) {
      const otm =
        type === 'call' ? strike > price : strike < price;
      const distance = Math.abs(strike - price) / price;
      const baseIV = 0.30 + Math.random() * 0.15; // 30-45% IV
      const iv = baseIV + distance * 0.1; // IV smile

      // Simple Black-Scholes-ish premium approximation
      const intrinsic =
        type === 'call'
          ? Math.max(price - strike, 0)
          : Math.max(strike - price, 0);
      const timeValue = price * iv * Math.sqrt(1 / 365) * (otm ? 0.8 : 1.2);
      const premium = Math.max(intrinsic + timeValue, 0.01);
      const spread = premium * 0.05;

      // Delta approximation: sigmoid-like decay from ATM
      // Calls: +0.5 at ATM, approaching 0 far OTM, approaching 1 deep ITM
      // Puts: negative mirror of calls
      const rawDelta = 0.5 + (price - strike) / (price * 0.3);
      const delta =
        type === 'call'
          ? Math.max(0.01, Math.min(0.99, rawDelta))
          : -Math.max(0.01, Math.min(0.99, 1 - rawDelta));

      contracts.push({
        symbol: `${symbol}${expiration.replace(/-/g, '')}${type === 'call' ? 'C' : 'P'}${String(Math.round(strike * 1000)).padStart(8, '0')}`,
        description: `${symbol} ${expiration} ${strike} ${type}`,
        exch: 'CBOE',
        type,
        strike,
        expiration_date: expiration,
        bid: +Math.max(premium - spread, 0.01).toFixed(2),
        ask: +(premium + spread).toFixed(2),
        last: +premium.toFixed(2),
        volume: Math.floor(Math.random() * 5000) + (otm ? 100 : 1000),
        open_interest: Math.floor(Math.random() * 20000) + 500,
        underlying: symbol,
        greeks: {
          delta: +delta.toFixed(4),
          gamma: +(0.02 * (1 - distance * 2)).toFixed(4),
          theta: +(-premium * 0.1).toFixed(4),
          vega: +(premium * 0.3).toFixed(4),
          rho: +(delta * 0.01).toFixed(4),
          phi: 0,
          bid_iv: +(iv - 0.01).toFixed(4),
          mid_iv: +iv.toFixed(4),
          ask_iv: +(iv + 0.01).toFixed(4),
          smv_vol: +iv.toFixed(4),
          updated_at: new Date().toISOString(),
        },
      });
    }
  }

  return contracts;
}
