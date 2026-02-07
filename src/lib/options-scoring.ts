// 0DTE Covered Call Decision Engine
// Based on the Daily H.E.A.T. framework:
//   1. "Is implied volatility cheap (skip) or rich (sell some)?"
//   2. "Am I getting paid enough to cap today's upside?"
//   3. "Do I want to stay fully exposed because something is brewing?"
//
// Scoring: IV Percentile (40%) + Premium Richness (30%) + Assignment Risk (20%) + Strike Distance (10%)

import { SCORING } from './constants';
import type { TradierOptionContract } from '@/types/tradier';
import type { EdgeScore, Recommendation } from '@/types/scoring';

export function scoreStrike(
  ticker: string,
  stockPrice: number,
  contract: TradierOptionContract,
  ivPercentile: number,
): EdgeScore {
  const premium = (contract.bid + contract.ask) / 2;
  const premiumPct = premium / stockPrice;
  const delta = Math.abs(contract.greeks?.delta ?? 0);
  const distancePct = ((contract.strike - stockPrice) / stockPrice) * 100;

  // 1. IV Percentile (0-100 → 0-100 scaled)
  const ivScore = ivPercentile;

  // 2. Premium Richness: premium as multiple of "fair" 0DTE premium
  const richness = premiumPct / SCORING.FAIR_PREMIUM_PCT;
  const premiumScore = Math.min(richness * 50, 100);

  // 3. Assignment risk: prefer 70-90% prob OTM (delta 0.10-0.30)
  let assignmentScore: number;
  if (delta <= 0.10) assignmentScore = 50; // very far OTM, low premium
  else if (delta <= 0.30) assignmentScore = 100; // sweet spot
  else if (delta <= 0.50) assignmentScore = 60; // borderline
  else assignmentScore = 20; // too close / ITM

  // 4. Strike distance: reward 2-10% OTM
  let distanceScore: number;
  if (distancePct < 0) distanceScore = 0; // ITM
  else if (distancePct <= 2) distanceScore = 40; // very close
  else if (distancePct <= 10) distanceScore = 100; // sweet spot
  else if (distancePct <= 15) distanceScore = 60;
  else distanceScore = 30; // too far

  const score = Math.round(
    ivScore * SCORING.IV_WEIGHT +
    premiumScore * SCORING.PREMIUM_WEIGHT +
    assignmentScore * SCORING.ASSIGNMENT_WEIGHT +
    distanceScore * SCORING.DISTANCE_WEIGHT,
  );

  // Determine recommendation
  let recommendation: Recommendation;
  if (score >= SCORING.STRONG_SELL_THRESHOLD) recommendation = 'STRONG_SELL';
  else if (score >= SCORING.SELL_THRESHOLD) recommendation = 'SELL';
  else if (score >= SCORING.NEUTRAL_THRESHOLD) recommendation = 'NEUTRAL';
  else recommendation = 'SKIP';

  // Override: depressed IV environment — not enough premium to justify capping upside
  if (ivPercentile < 25 && recommendation !== 'SKIP') {
    recommendation = 'SKIP';
  }

  // Override: premium too small to cover transaction costs + slippage
  if (premium < SCORING.MIN_PREMIUM) {
    recommendation = 'SKIP';
  }

  // Override: dangerously close to ATM — high assignment risk on 0DTE
  if (distancePct < 1 && delta > 0.45) {
    recommendation = 'SKIP';
  }

  const reasoning: string[] = [];
  if (ivPercentile >= 70) reasoning.push(`IV at ${ivPercentile}th percentile — rich, good to sell`);
  else if (ivPercentile >= 40) reasoning.push(`IV at ${ivPercentile}th percentile — moderate`);
  else reasoning.push(`IV at ${ivPercentile}th percentile — cheap, consider skipping`);

  if (richness >= 1.5) reasoning.push(`Premium ${richness.toFixed(1)}x fair value — attractive`);
  else if (richness >= 1.0) reasoning.push(`Premium ${richness.toFixed(1)}x fair value — adequate`);
  else reasoning.push(`Premium ${richness.toFixed(1)}x fair value — thin`);

  if (delta > 0.50) reasoning.push(`High assignment risk (${(delta * 100).toFixed(0)}% delta)`);
  if (distancePct >= 2 && distancePct <= 10) reasoning.push(`${distancePct.toFixed(1)}% OTM — safe buffer`);

  return {
    ticker,
    strike: contract.strike,
    expiration: contract.expiration_date,
    premium: +premium.toFixed(2),
    annualizedReturn: premiumPct * 365 * 100,
    ivPercentile,
    premiumRichness: +richness.toFixed(2),
    assignmentProbability: delta,
    score,
    recommendation,
    reasoning,
  };
}

export function scoreAllStrikes(
  ticker: string,
  stockPrice: number,
  chain: TradierOptionContract[],
  ivPercentile: number,
): EdgeScore[] {
  return chain
    .filter(
      (c) =>
        c.type === 'call' &&
        c.strike >= stockPrice && // OTM calls only
        c.strike <= stockPrice * 1.15 && // within 15%
        (c.bid + c.ask) / 2 >= SCORING.MIN_PREMIUM,
    )
    .map((c) => scoreStrike(ticker, stockPrice, c, ivPercentile))
    .sort((a, b) => b.score - a.score);
}
