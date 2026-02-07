'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePortfolioStore } from '@/lib/portfolio-store';
import { PortfolioEditor } from '@/components/portfolio-editor';
import { RefreshBar } from '@/components/refresh-bar';
import { usePolling } from '@/lib/use-polling';
import {
  calculatePortfolioRisk,
  suggestHedges,
  getVIXLevel,
  type PortfolioRisk,
} from '@/lib/hedge-calculator';
import type { TradierQuote, TradierOptionContract } from '@/types/tradier';
import type { HedgeSuggestion } from '@/types/scoring';

export default function HedgePage() {
  const positions = usePortfolioStore((s) => s.positions);
  const [quotes, setQuotes] = useState<Map<string, TradierQuote>>(new Map());
  const [risks, setRisks] = useState<PortfolioRisk[]>([]);
  const [hedges, setHedges] = useState<HedgeSuggestion[]>([]);
  const [vix, setVix] = useState(18.5);
  const [showEditor, setShowEditor] = useState(false);
  const [hedgeLoading, setHedgeLoading] = useState(false);

  const tickers = positions.map((p) => p.ticker).join(',');

  // Fetch quotes for all positions via polling
  const fetchQuotes = useCallback(async () => {
    if (!tickers) return;
    const res = await fetch(`/api/quotes?symbols=${tickers}`);
    const d = await res.json();
    const qList: TradierQuote[] = Array.isArray(d.quotes)
      ? d.quotes
      : [d.quotes];
    const qMap = new Map<string, TradierQuote>();
    qList.forEach((q) => qMap.set(q.symbol, q));
    setQuotes(qMap);
  }, [tickers]);

  const { interval, changeInterval, lastUpdated, isRefreshing, refreshNow } =
    usePolling(fetchQuotes, [tickers]);

  // Calculate risk when quotes update
  useEffect(() => {
    if (quotes.size === 0 || positions.length === 0) return;
    setRisks(calculatePortfolioRisk(positions, quotes));
  }, [quotes, positions]);

  // Fetch VIX (mock for now)
  useEffect(() => {
    setVix(18.5 + Math.random() * 5);
  }, []);

  // Fetch hedges for high-risk positions
  const highRiskTickers = risks
    .filter((r) => r.riskLevel !== 'LOW')
    .map((r) => r.ticker)
    .sort()
    .join(',');

  useEffect(() => {
    if (!highRiskTickers || quotes.size === 0) return;
    let cancelled = false;
    setHedgeLoading(true);

    const riskTickers = highRiskTickers.split(',');
    Promise.all(
      riskTickers.slice(0, 3).map(async (ticker) => {
        const q = quotes.get(ticker);
        if (!q) return [];

        const expiresRes = await fetch(`/api/expirations?symbol=${ticker}`);
        const expiresData = await expiresRes.json();
        const exp =
          expiresData.expirations?.[1] ?? expiresData.expirations?.[0];
        if (!exp) return [];

        const chainRes = await fetch(
          `/api/options?symbol=${ticker}&expiration=${exp}`,
        );
        const chainData = await chainRes.json();
        const chain: TradierOptionContract[] = chainData.options ?? [];
        const pos = positions.find((p) => p.ticker === ticker);
        if (!pos) return [];

        return suggestHedges(pos, q, chain);
      }),
    ).then((results) => {
      if (!cancelled) {
        setHedges(results.flat());
        setHedgeLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [highRiskTickers]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalValue = risks.reduce((s, r) => s + r.marketValue, 0);
  const totalPnL = risks.reduce((s, r) => s + r.unrealizedPnL, 0);
  const vixInfo = getVIXLevel(vix);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">H — Hedge</h1>
          <p className="text-muted text-sm mt-1">
            Portfolio risk dashboard — &quot;Hedge against disaster&quot;
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshBar
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            interval={interval}
            onIntervalChange={changeInterval}
            onRefreshNow={refreshNow}
          />
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="bg-card border border-card-border px-4 py-2 rounded text-sm hover:border-accent transition-colors"
          >
            {showEditor ? 'Hide' : 'Edit'} Portfolio
          </button>
        </div>
      </div>

      {showEditor && (
        <div className="bg-card border border-card-border rounded-lg p-4">
          <PortfolioEditor />
        </div>
      )}

      {positions.length === 0 ? (
        <div className="bg-card border border-card-border rounded-lg p-8 text-center">
          <p className="text-muted mb-2">
            No positions yet. Add your holdings to see risk analysis.
          </p>
          <button
            onClick={() => setShowEditor(true)}
            className="bg-accent text-background px-4 py-2 rounded text-sm font-medium hover:bg-accent-muted transition-colors"
          >
            Add Positions
          </button>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-xs text-muted">Portfolio Value</div>
              <div className="text-xl font-mono font-bold mt-1">
                $
                {totalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-xs text-muted">Unrealized P&L</div>
              <div
                className={`text-xl font-mono font-bold mt-1 ${
                  totalPnL >= 0 ? 'text-green' : 'text-red'
                }`}
              >
                {totalPnL >= 0 ? '+' : ''}$
                {totalPnL.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-xs text-muted">VIX</div>
              <div
                className={`text-xl font-mono font-bold mt-1 ${vixInfo.color}`}
              >
                {vix.toFixed(1)}
              </div>
              <div className="text-xs text-muted mt-1">
                {vixInfo.description}
              </div>
            </div>
          </div>

          {/* Risk table */}
          <div className="bg-card border border-card-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border">
              <h2 className="font-bold text-sm">Position Risk</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs text-left border-b border-card-border">
                  <th className="px-4 py-2">Ticker</th>
                  <th className="px-4 py-2">Shares</th>
                  <th className="px-4 py-2">Value</th>
                  <th className="px-4 py-2">P&L</th>
                  <th className="px-4 py-2">Weight</th>
                  <th className="px-4 py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr
                    key={r.ticker}
                    className="border-b border-card-border/50"
                  >
                    <td className="px-4 py-2 font-mono font-bold">
                      {r.ticker}
                    </td>
                    <td className="px-4 py-2 font-mono">{r.shares}</td>
                    <td className="px-4 py-2 font-mono">
                      $
                      {r.marketValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td
                      className={`px-4 py-2 font-mono ${
                        r.unrealizedPnL >= 0 ? 'text-green' : 'text-red'
                      }`}
                    >
                      {r.pnlPercent >= 0 ? '+' : ''}
                      {r.pnlPercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {r.portfolioWeight.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-bold ${
                          r.riskLevel === 'HIGH'
                            ? 'text-red'
                            : r.riskLevel === 'MEDIUM'
                              ? 'text-yellow'
                              : 'text-green'
                        }`}
                      >
                        {r.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hedge suggestions */}
          {hedgeLoading ? (
            <div className="text-muted text-sm">
              Calculating hedge strategies...
            </div>
          ) : hedges.length > 0 ? (
            <div className="space-y-3">
              <h2 className="font-bold text-sm">Hedge Suggestions</h2>
              {hedges.map((h, i) => (
                <div
                  key={i}
                  className="bg-card border border-card-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold">{h.ticker}</span>{' '}
                      <span className="text-xs text-muted uppercase">
                        {h.strategy.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-muted">{h.expiration}</span>
                  </div>
                  <p className="text-sm mt-1">{h.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted">
                    <span>
                      Cost:{' '}
                      <span className="font-mono text-foreground">
                        ${h.cost.toFixed(0)}
                      </span>
                    </span>
                    <span>
                      Protection:{' '}
                      <span className="font-mono text-foreground">
                        {h.protection.toFixed(1)}%
                      </span>{' '}
                      downside
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
