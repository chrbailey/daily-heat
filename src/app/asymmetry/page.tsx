'use client';

import { useState, useEffect, useCallback } from 'react';
import { TickerSelect } from '@/components/ticker-select';
import { RefreshBar } from '@/components/refresh-bar';
import { usePolling } from '@/lib/use-polling';
import { scanForAsymmetry } from '@/lib/asymmetry-scanner';
import {
  hydrateIVHistory,
  getIVPercentile,
  getATMImpliedVolatility,
} from '@/lib/iv-tracker';
import type { TradierOptionContract } from '@/types/tradier';
import type { AsymmetrySetup } from '@/types/scoring';

export default function AsymmetryPage() {
  const [ticker, setTicker] = useState('NVDA');
  const [expiration, setExpiration] = useState('');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [setups, setSetups] = useState<AsymmetrySetup[]>([]);
  const [minRR, setMinRR] = useState(3);

  useEffect(() => hydrateIVHistory(), []);

  useEffect(() => {
    fetch(`/api/expirations?symbol=${ticker}`)
      .then((r) => r.json())
      .then((d) => {
        const dates: string[] = d.expirations ?? [];
        setExpirations(dates);
        if (dates.length > 1) setExpiration(dates[1]);
        else if (dates.length > 0) setExpiration(dates[0]);
      });
  }, [ticker]);

  const scan = useCallback(async () => {
    if (!expiration) return;

    const [quotesRes, chainRes] = await Promise.all([
      fetch(`/api/quotes?symbols=${ticker}`),
      fetch(`/api/options?symbol=${ticker}&expiration=${expiration}`),
    ]);

    const quotesData = await quotesRes.json();
    const chainData = await chainRes.json();

    const quotes = Array.isArray(quotesData.quotes)
      ? quotesData.quotes
      : [quotesData.quotes];
    const price = quotes[0]?.last ?? 0;
    const chain: TradierOptionContract[] = chainData.options ?? [];

    const atmIV = getATMImpliedVolatility(chain, price);
    const ivPctile = getIVPercentile(ticker, atmIV);

    const results = scanForAsymmetry(ticker, price, chain, ivPctile);
    setSetups(results.filter((s) => s.riskRewardRatio >= minRR));
  }, [ticker, expiration, minRR]);

  const { interval, changeInterval, lastUpdated, isRefreshing, refreshNow } =
    usePolling(scan, [ticker, expiration, minRR]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-yellow">A — Asymmetry</h1>
          <p className="text-muted text-sm mt-1">
            Find options with skewed risk/reward — spend $1 to make $5+
          </p>
        </div>
        <RefreshBar
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          interval={interval}
          onIntervalChange={changeInterval}
          onRefreshNow={refreshNow}
        />
      </div>

      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Ticker</label>
          <TickerSelect value={ticker} onChange={setTicker} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Expiration</label>
          <select
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            className="bg-card border border-card-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
          >
            {expirations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Min R:R</label>
          <select
            value={minRR}
            onChange={(e) => setMinRR(Number(e.target.value))}
            className="bg-card border border-card-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
          >
            <option value={3}>3:1</option>
            <option value={5}>5:1</option>
            <option value={8}>8:1</option>
            <option value={10}>10:1</option>
          </select>
        </div>
      </div>

      {isRefreshing && setups.length === 0 ? (
        <div className="text-muted text-sm">Scanning options chain...</div>
      ) : setups.length === 0 ? (
        <div className="bg-card border border-card-border rounded-lg p-6 text-center text-muted">
          No asymmetric setups found for {ticker} meeting {minRR}:1 threshold
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-muted text-xs text-left">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Strike</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Max Profit</th>
                <th className="px-4 py-3">R:R</th>
                <th className="px-4 py-3">Breakeven</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {setups.map((s, i) => (
                <tr
                  key={i}
                  className="border-b border-card-border/50 hover:bg-background/50"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold ${
                        s.type === 'call' ? 'text-green' : 'text-red'
                      }`}
                    >
                      {s.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    ${s.strike.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono">${s.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-green">
                    ${s.maxProfit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-yellow">
                    {s.riskRewardRatio}:1
                  </td>
                  <td className="px-4 py-3 font-mono">
                    ${s.breakeven.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {s.unusualVolume ? (
                      <span className="text-xs font-bold text-accent">
                        UNUSUAL
                      </span>
                    ) : (
                      <span className="text-xs text-muted">normal</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold font-mono">{s.score}</span>
                    <span className="text-muted">/100</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
