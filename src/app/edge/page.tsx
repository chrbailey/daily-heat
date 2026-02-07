'use client';

import { useState, useEffect, useCallback } from 'react';
import { TickerSelect } from '@/components/ticker-select';
import { ScoreBadge } from '@/components/score-badge';
import { IVGauge } from '@/components/iv-gauge';
import { RefreshBar } from '@/components/refresh-bar';
import { usePolling } from '@/lib/use-polling';
import { scoreAllStrikes } from '@/lib/options-scoring';
import {
  hydrateIVHistory,
  recordIVSnapshot,
  getIVPercentile,
  getATMImpliedVolatility,
} from '@/lib/iv-tracker';
import type { TradierQuote, TradierOptionContract } from '@/types/tradier';
import type { EdgeScore } from '@/types/scoring';

export default function EdgePage() {
  const [ticker, setTicker] = useState('NVDA');
  const [expiration, setExpiration] = useState('');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [quote, setQuote] = useState<TradierQuote | null>(null);
  const [scores, setScores] = useState<EdgeScore[]>([]);
  const [ivPercentile, setIvPercentile] = useState(50);

  // Hydrate IV history from localStorage
  useEffect(() => hydrateIVHistory(), []);

  // Fetch expirations when ticker changes
  useEffect(() => {
    fetch(`/api/expirations?symbol=${ticker}`)
      .then((r) => r.json())
      .then((d) => {
        const dates = d.expirations ?? [];
        setExpirations(dates);
        if (dates.length > 0) setExpiration(dates[0]);
      });
  }, [ticker]);

  // Main data fetch: quote + chain + score
  const fetchData = useCallback(async () => {
    if (!expiration) return;

    const [quotesRes, chainRes] = await Promise.all([
      fetch(`/api/quotes?symbols=${ticker}`),
      fetch(`/api/options?symbol=${ticker}&expiration=${expiration}`),
    ]);

    const quotesData = await quotesRes.json();
    const chainData = await chainRes.json();

    const q = Array.isArray(quotesData.quotes)
      ? quotesData.quotes[0]
      : quotesData.quotes;
    setQuote(q);

    const chain: TradierOptionContract[] = chainData.options ?? [];
    if (!q || chain.length === 0) {
      setScores([]);
      return;
    }

    const atmIV = getATMImpliedVolatility(chain, q.last);
    recordIVSnapshot(ticker, atmIV);
    const pctile = getIVPercentile(ticker, atmIV);
    setIvPercentile(pctile);

    const results = scoreAllStrikes(ticker, q.last, chain, pctile);
    setScores(results);
  }, [ticker, expiration]);

  const { interval, changeInterval, lastUpdated, isRefreshing, refreshNow } =
    usePolling(fetchData, [ticker, expiration]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent">E — Edge</h1>
          <p className="text-muted text-sm mt-1">
            0DTE Covered Call Decision Engine — &quot;Am I getting paid enough to
            cap today&apos;s upside?&quot;
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

      {/* Controls */}
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
                {d === expirations[0] ? ' (nearest)' : ''}
              </option>
            ))}
          </select>
        </div>
        {quote && (
          <div className="ml-auto text-right">
            <div className="text-2xl font-mono font-bold">
              ${quote.last.toFixed(2)}
            </div>
            <div
              className={`text-sm font-mono ${
                quote.change >= 0 ? 'text-green' : 'text-red'
              }`}
            >
              {quote.change >= 0 ? '+' : ''}
              {quote.change.toFixed(2)} ({quote.change_percentage.toFixed(2)}%)
            </div>
          </div>
        )}
      </div>

      {/* IV Gauge */}
      <div className="bg-card border border-card-border rounded-lg p-4 max-w-md">
        <IVGauge percentile={ivPercentile} />
      </div>

      {/* Scores Table */}
      {isRefreshing && scores.length === 0 ? (
        <div className="text-muted text-sm">Loading options chain...</div>
      ) : scores.length === 0 ? (
        <div className="bg-card border border-card-border rounded-lg p-6 text-center text-muted">
          No 0DTE options available for {ticker} on {expiration}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-muted text-xs text-left">
                <th className="px-4 py-3">Strike</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3">Ann. Return</th>
                <th className="px-4 py-3">Delta</th>
                <th className="px-4 py-3">Richness</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 10).map((s) => (
                <tr
                  key={s.strike}
                  className="border-b border-card-border/50 hover:bg-background/50"
                >
                  <td className="px-4 py-3 font-mono">${s.strike.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono">${s.premium.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono">
                    {s.annualizedReturn.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {s.assignmentProbability.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono">{s.premiumRichness}x</td>
                  <td className="px-4 py-3">
                    <span className="font-bold font-mono">{s.score}</span>
                    <span className="text-muted">/100</span>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge recommendation={s.recommendation} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted max-w-xs">
                    {s.reasoning[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Article Reference */}
      <div className="bg-card border border-card-border rounded-lg p-4 text-xs text-muted space-y-2">
        <p className="font-bold text-foreground">The Daily Decision Framework</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            &quot;Is implied volatility cheap (skip) or rich (sell some)?&quot; —{' '}
            <span className="text-accent">Check IV Gauge above</span>
          </li>
          <li>
            &quot;Am I getting paid enough to cap today&apos;s upside?&quot; —{' '}
            <span className="text-accent">Check Richness column</span>
          </li>
          <li>
            &quot;Do I want to stay fully exposed because something is
            brewing?&quot; —{' '}
            <span className="text-accent">Check Theme pillar</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
