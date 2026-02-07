// Mag 7 + IBIT — the tickers from the article's "Qualifying Securities"
export const DEFAULT_TICKERS = [
  'AAPL', 'AMZN', 'AVGO', 'GOOGL', 'META', 'MSFT', 'NVDA', 'TSLA', 'IBIT',
] as const;

// Scoring thresholds (from the article's framework)
export const SCORING = {
  IV_WEIGHT: 0.40,        // "Is implied volatility cheap (skip) or rich (sell some)?"
  PREMIUM_WEIGHT: 0.30,   // "Am I getting paid enough to cap today's upside?"
  ASSIGNMENT_WEIGHT: 0.20, // Probability of keeping shares
  DISTANCE_WEIGHT: 0.10,  // Strike distance from current price
  STRONG_SELL_THRESHOLD: 75,
  SELL_THRESHOLD: 60,
  NEUTRAL_THRESHOLD: 40,
  MIN_PREMIUM: 0.10,      // Don't bother below $0.10
  FAIR_PREMIUM_PCT: 0.008, // 0.8% is "fair" for 0DTE ATM (from article)
} as const;

// VIX thresholds for hedge pillar
export const VIX_LEVELS = {
  LOW: 15,
  NORMAL: 20,
  ELEVATED: 25,
  HIGH: 30,
  EXTREME: 40,
} as const;
