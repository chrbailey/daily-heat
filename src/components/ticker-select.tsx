'use client';

import { DEFAULT_TICKERS } from '@/lib/constants';
import { usePortfolioStore } from '@/lib/portfolio-store';

interface TickerSelectProps {
  value: string;
  onChange: (ticker: string) => void;
}

export function TickerSelect({ value, onChange }: TickerSelectProps) {
  const customTickers = usePortfolioStore((s) => s.customTickers);
  const allTickers = [...DEFAULT_TICKERS, ...customTickers];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-card border border-card-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
    >
      {allTickers.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
