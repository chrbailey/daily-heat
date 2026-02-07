'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { DEFAULT_TICKERS } from '@/lib/constants';
import { RefreshBar } from '@/components/refresh-bar';
import { usePolling } from '@/lib/use-polling';
import type { TradierQuote } from '@/types/tradier';

export default function Dashboard() {
  const [quotes, setQuotes] = useState<TradierQuote[]>([]);

  const fetchQuotes = useCallback(async () => {
    const res = await fetch(`/api/quotes?symbols=${DEFAULT_TICKERS.join(',')}`);
    const d = await res.json();
    setQuotes(Array.isArray(d.quotes) ? d.quotes : [d.quotes]);
  }, []);

  const { interval, changeInterval, lastUpdated, isRefreshing, refreshNow } =
    usePolling(fetchQuotes, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2 py-4">
        <h1 className="text-4xl font-bold">
          The Daily{' '}
          <span className="text-accent">H</span>
          <span className="text-accent">.</span>
          <span className="text-accent">E</span>
          <span className="text-accent">.</span>
          <span className="text-accent">A</span>
          <span className="text-accent">.</span>
          <span className="text-accent">T</span>
          <span className="text-accent">.</span>
        </h1>
        <p className="text-muted text-sm">
          Torching Wall Street&apos;s Obsolete Playbook
        </p>
      </div>

      {/* Four Pillars */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/hedge" className="group">
          <div className="bg-card border border-card-border rounded-lg p-6 hover:border-blue-400/50 transition-colors">
            <div className="text-blue-400 text-3xl font-bold mb-2">H</div>
            <h2 className="font-bold text-lg">Hedge</h2>
            <p className="text-muted text-sm mt-1">
              Portfolio risk dashboard. VIX monitoring. Hedge suggestions
              (protective puts, collars, spreads).
            </p>
            <p className="text-blue-400 text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              &quot;Hedge against disaster&quot; &rarr;
            </p>
          </div>
        </Link>

        <Link href="/edge" className="group">
          <div className="bg-card border border-card-border rounded-lg p-6 hover:border-accent/50 transition-colors">
            <div className="text-accent text-3xl font-bold mb-2">E</div>
            <h2 className="font-bold text-lg">Edge</h2>
            <p className="text-muted text-sm mt-1">
              0DTE covered call decision engine. IV percentile ranking.
              Premium richness signals. Daily sell/skip.
            </p>
            <p className="text-accent text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              &quot;Find your edge&quot; &rarr;
            </p>
          </div>
        </Link>

        <Link href="/asymmetry" className="group">
          <div className="bg-card border border-card-border rounded-lg p-6 hover:border-yellow/50 transition-colors">
            <div className="text-yellow text-3xl font-bold mb-2">A</div>
            <h2 className="font-bold text-lg">Asymmetry</h2>
            <p className="text-muted text-sm mt-1">
              Options scanner for skewed risk/reward. Unusual volume
              detection. Find setups where upside &gt;&gt; downside.
            </p>
            <p className="text-yellow text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              &quot;Exploit asymmetric opportunities&quot; &rarr;
            </p>
          </div>
        </Link>

        <Link href="/theme" className="group">
          <div className="bg-card border border-card-border rounded-lg p-6 hover:border-green/50 transition-colors">
            <div className="text-green text-3xl font-bold mb-2">T</div>
            <h2 className="font-bold text-lg">Theme</h2>
            <p className="text-muted text-sm mt-1">
              LLM-powered news analysis. Separate signal from noise. Ride
              major themes before Wall Street catches on.
            </p>
            <p className="text-green text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              &quot;Ride major themes&quot; &rarr;
            </p>
          </div>
        </Link>
      </div>

      {/* Market Overview */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
          <h2 className="font-bold text-sm">Mag 7 + IBIT</h2>
          <RefreshBar
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            interval={interval}
            onIntervalChange={changeInterval}
            onRefreshNow={refreshNow}
          />
        </div>
        {quotes.length > 0 && (
          <div className="grid grid-cols-3 gap-px bg-card-border">
            {quotes.map((q) => (
              <div
                key={q.symbol}
                className="bg-card px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono font-bold text-sm">
                    {q.symbol}
                  </div>
                  <div className="text-xs text-muted">
                    {q.description?.split(' ').slice(0, 2).join(' ')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    ${q.last?.toFixed(2)}
                  </div>
                  <div
                    className={`text-xs font-mono ${
                      (q.change ?? 0) >= 0 ? 'text-green' : 'text-red'
                    }`}
                  >
                    {(q.change ?? 0) >= 0 ? '+' : ''}
                    {q.change_percentage?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reference */}
      <div className="text-center text-xs text-muted space-y-1 pb-4">
        <p>
          Based on the 0DTE options framework from The Daily H.E.A.T. newsletter
        </p>
        <p>
          &quot;The investors who adapt early won&apos;t just collect premium.
          They&apos;ll preserve the upside windows that actually move
          portfolios.&quot;
        </p>
      </div>
    </div>
  );
}
