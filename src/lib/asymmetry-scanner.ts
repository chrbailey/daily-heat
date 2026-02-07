// Asymmetry Scanner
// Finds options with skewed risk/reward profiles
// The article's promise: "exploit Asymmetric opportunities"

import type { TradierOptionContract } from '@/types/tradier';
import type { AsymmetrySetup } from '@/types/scoring';

export function scanForAsymmetry(
  ticker: string,
  stockPrice: number,
  chain: TradierOptionContract[],
  ivPercentile: number,
): AsymmetrySetup[] {
  const setups: AsymmetrySetup[] = [];

  for (const contract of chain) {
    if (!contract.greeks) continue;

    const premium = (contract.bid + contract.ask) / 2;
    if (premium < 0.10 || premium > stockPrice * 0.05) continue;

    const breakeven =
      contract.type === 'call'
        ? contract.strike + premium
        : contract.strike - premium;

    // Estimate max profit for OTM options
    // For calls: assume a 10% move as "max reasonable" target
    const targetMove = stockPrice * 0.10;
    let maxProfit: number;
    if (contract.type === 'call') {
      maxProfit = Math.max(stockPrice + targetMove - contract.strike - premium, 0);
    } else {
      maxProfit = Math.max(contract.strike - (stockPrice - targetMove) - premium, 0);
    }

    const riskRewardRatio = maxProfit / premium;

    // Only include setups with at least 3:1 risk/reward
    if (riskRewardRatio < 3) continue;

    // Detect unusual volume (volume > 2x open interest)
    const unusualVolume = contract.volume > contract.open_interest * 2;

    // Score: R:R ratio (40%) + unusual volume (20%) + IV cheapness (40%)
    const rrScore = Math.min(riskRewardRatio * 5, 40);
    const volScore = unusualVolume ? 20 : 0;
    // Low IV = cheap options = better for buying
    const ivScore = Math.max(0, (100 - ivPercentile) * 0.4);
    const score = Math.round(rrScore + volScore + ivScore);

    setups.push({
      ticker,
      strike: contract.strike,
      expiration: contract.expiration_date,
      type: contract.type,
      cost: +premium.toFixed(2),
      maxProfit: +maxProfit.toFixed(2),
      breakeven: +breakeven.toFixed(2),
      riskRewardRatio: +riskRewardRatio.toFixed(1),
      ivRank: ivPercentile,
      unusualVolume,
      score,
    });
  }

  return setups.sort((a, b) => b.score - a.score).slice(0, 20);
}
