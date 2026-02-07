'use client';

import type { Recommendation } from '@/types/scoring';

const COLORS: Record<Recommendation, string> = {
  STRONG_SELL: 'bg-green/20 text-green border-green/40',
  SELL: 'bg-green/10 text-green border-green/30',
  NEUTRAL: 'bg-yellow/10 text-yellow border-yellow/30',
  SKIP: 'bg-red/10 text-red border-red/30',
};

const LABELS: Record<Recommendation, string> = {
  STRONG_SELL: 'STRONG SELL',
  SELL: 'SELL',
  NEUTRAL: 'NEUTRAL',
  SKIP: 'SKIP',
};

export function ScoreBadge({ recommendation }: { recommendation: Recommendation }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border text-xs font-bold tracking-wider ${COLORS[recommendation]}`}
    >
      {LABELS[recommendation]}
    </span>
  );
}
