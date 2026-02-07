// Hedge suggestion logic
// Analyzes positions and suggests protective strategies

import type { Position } from '@/types/portfolio';
import type { TradierQuote, TradierOptionContract } from '@/types/tradier';
import type { HedgeSuggestion } from '@/types/scoring';
import { VIX_LEVELS } from './constants';

export interface PortfolioRisk {
  ticker: string;
  shares: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  pnlPercent: number;
  portfolioWeight: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function calculatePortfolioRisk(
  positions: Position[],
  quotes: Map<string, TradierQuote>,
): PortfolioRisk[] {
  const totalValue = positions.reduce((sum, p) => {
    const q = quotes.get(p.ticker);
    return sum + (q ? q.last * p.shares : p.costBasis * p.shares);
  }, 0);

  return positions.map((p) => {
    const q = quotes.get(p.ticker);
    const price = q?.last ?? p.costBasis;
    const marketValue = price * p.shares;
    const unrealizedPnL = (price - p.costBasis) * p.shares;
    const pnlPercent = ((price - p.costBasis) / p.costBasis) * 100;
    const portfolioWeight = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;

    let riskLevel: PortfolioRisk['riskLevel'] = 'LOW';
    if (portfolioWeight > 30) riskLevel = 'HIGH';
    else if (portfolioWeight > 15 || Math.abs(pnlPercent) > 20) riskLevel = 'MEDIUM';

    return {
      ticker: p.ticker,
      shares: p.shares,
      marketValue,
      costBasis: p.costBasis,
      unrealizedPnL,
      pnlPercent,
      portfolioWeight,
      riskLevel,
    };
  });
}

export function suggestHedges(
  position: Position,
  quote: TradierQuote,
  puts: TradierOptionContract[],
): HedgeSuggestion[] {
  const suggestions: HedgeSuggestion[] = [];
  const price = quote.last;

  // Find a 5% OTM put for protective put
  const protectivePut = puts.find(
    (p) =>
      p.type === 'put' &&
      p.strike >= price * 0.93 &&
      p.strike <= price * 0.97,
  );

  if (protectivePut) {
    const cost = ((protectivePut.bid + protectivePut.ask) / 2) * 100;
    suggestions.push({
      ticker: position.ticker,
      strategy: 'protective_put',
      description: `Buy ${protectivePut.strike} put for downside protection`,
      cost,
      protection: ((price - protectivePut.strike) / price) * 100,
      strikes: [{ type: 'put', strike: protectivePut.strike }],
      expiration: protectivePut.expiration_date,
    });
  }

  // Put spread: buy 5% OTM, sell 10% OTM
  const longPut = puts.find(
    (p) => p.type === 'put' && p.strike >= price * 0.93 && p.strike <= price * 0.97,
  );
  const shortPut = puts.find(
    (p) => p.type === 'put' && p.strike >= price * 0.88 && p.strike <= price * 0.92,
  );

  if (longPut && shortPut) {
    const longPrem = (longPut.bid + longPut.ask) / 2;
    const shortPrem = (shortPut.bid + shortPut.ask) / 2;
    const netCost = (longPrem - shortPrem) * 100;

    suggestions.push({
      ticker: position.ticker,
      strategy: 'put_spread',
      description: `Buy ${longPut.strike}/${shortPut.strike} put spread`,
      cost: netCost,
      protection: ((price - longPut.strike) / price) * 100,
      strikes: [
        { type: 'put', strike: longPut.strike },
        { type: 'put', strike: shortPut.strike },
      ],
      expiration: longPut.expiration_date,
    });
  }

  return suggestions;
}

export function getVIXLevel(vix: number): {
  level: string;
  color: string;
  description: string;
} {
  if (vix < VIX_LEVELS.LOW)
    return { level: 'Low', color: 'text-green', description: 'Complacency — cheap hedges available' };
  if (vix < VIX_LEVELS.NORMAL)
    return { level: 'Normal', color: 'text-foreground', description: 'Standard volatility environment' };
  if (vix < VIX_LEVELS.ELEVATED)
    return { level: 'Elevated', color: 'text-yellow', description: 'Heightened fear — hedges getting expensive' };
  if (vix < VIX_LEVELS.HIGH)
    return { level: 'High', color: 'text-accent', description: 'Significant fear — consider reducing exposure' };
  return { level: 'Extreme', color: 'text-red', description: 'Panic — hedging is expensive but critical' };
}
