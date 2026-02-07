export type Recommendation = 'STRONG_SELL' | 'SELL' | 'NEUTRAL' | 'SKIP';

export interface EdgeScore {
  ticker: string;
  strike: number;
  expiration: string;
  premium: number;
  annualizedReturn: number;
  ivPercentile: number;
  premiumRichness: number;
  assignmentProbability: number;
  score: number; // 0-100
  recommendation: Recommendation;
  reasoning: string[];
}

export interface HedgeSuggestion {
  ticker: string;
  strategy: 'protective_put' | 'collar' | 'put_spread';
  description: string;
  cost: number;
  protection: number; // % downside covered
  strikes: { type: 'put' | 'call'; strike: number }[];
  expiration: string;
}

export interface AsymmetrySetup {
  ticker: string;
  strike: number;
  expiration: string;
  type: 'call' | 'put';
  cost: number;
  maxProfit: number;
  breakeven: number;
  riskRewardRatio: number;
  ivRank: number;
  unusualVolume: boolean;
  score: number;
}

export interface ThemeAnalysis {
  headline: string;
  classification: 'SIGNAL' | 'NOISE';
  sector?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  urgency?: 'high' | 'medium' | 'low';
  reasoning: string;
}
