'use client';

import { useState, useCallback } from 'react';
import { TickerSelect } from '@/components/ticker-select';
import { RefreshBar } from '@/components/refresh-bar';
import { usePolling } from '@/lib/use-polling';
import type { ThemeAnalysis } from '@/types/scoring';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export default function ThemePage() {
  const [ticker, setTicker] = useState('NVDA');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [manualHeadlines, setManualHeadlines] = useState('');
  const [analyses, setAnalyses] = useState<ThemeAnalysis[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Auto-fetch news headlines via polling
  const fetchNews = useCallback(async () => {
    const query = `${ticker} stock options trading`;
    const res = await fetch(`/api/news?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setNewsItems(data.headlines ?? []);
  }, [ticker]);

  const { interval, changeInterval, lastUpdated, isRefreshing, refreshNow } =
    usePolling(fetchNews, [ticker]);

  const analyzeHeadlines = async (headlines: string[]) => {
    if (headlines.length === 0) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines, ticker }),
      });
      const data = await res.json();
      setAnalyses(data.analyses ?? []);
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeNews = () => {
    analyzeHeadlines(newsItems.slice(0, 10).map((n) => n.title));
  };

  const analyzeManual = () => {
    const lines = manualHeadlines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    analyzeHeadlines(lines);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-green">T — Theme</h1>
          <p className="text-muted text-sm mt-1">
            Signal vs Noise — Auto-fetched news with Claude analysis
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

      {/* Ticker */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">
            Context Ticker
          </label>
          <TickerSelect value={ticker} onChange={setTicker} />
        </div>
      </div>

      {/* Auto-fetched News Headlines */}
      {newsItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">
              Latest Headlines ({newsItems.length})
            </h2>
            <button
              onClick={analyzeNews}
              disabled={analyzing}
              className="bg-green text-background px-4 py-1.5 rounded text-xs font-medium hover:bg-green/80 transition-colors disabled:opacity-50"
            >
              {analyzing ? 'Analyzing...' : 'Analyze All with Claude'}
            </button>
          </div>
          <div className="bg-card border border-card-border rounded-lg divide-y divide-card-border/50">
            {newsItems.slice(0, 10).map((item, i) => (
              <div
                key={i}
                className="px-4 py-2.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{item.title}</p>
                  <div className="flex gap-2 text-xs text-muted mt-0.5">
                    {item.source && <span>{item.source}</span>}
                    {item.pubDate && (
                      <span>
                        {new Date(item.pubDate).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent shrink-0 hover:underline"
                  >
                    open
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Input */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm">Manual Headlines</h2>
        <textarea
          value={manualHeadlines}
          onChange={(e) => setManualHeadlines(e.target.value)}
          rows={4}
          placeholder={`Paste additional headlines (one per line)...\nFed holds rates steady, Powell signals patience\nNVDA announces new AI chip architecture`}
          className="w-full bg-card border border-card-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent resize-y"
        />
        <button
          onClick={analyzeManual}
          disabled={analyzing || !manualHeadlines.trim()}
          className="bg-green text-background px-6 py-2 rounded text-sm font-medium hover:bg-green/80 transition-colors disabled:opacity-50"
        >
          {analyzing ? 'Analyzing...' : 'Analyze Manual Headlines'}
        </button>
      </div>

      {/* Results */}
      {analyses.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-sm">Analysis Results</h2>
          {analyses.map((a, i) => (
            <div
              key={i}
              className={`bg-card border rounded-lg p-4 ${
                a.classification === 'SIGNAL'
                  ? 'border-green/40'
                  : 'border-card-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    a.classification === 'SIGNAL'
                      ? 'bg-green/20 text-green'
                      : 'bg-card-border text-muted'
                  }`}
                >
                  {a.classification}
                </span>
                {a.sentiment && (
                  <span
                    className={`text-xs ${
                      a.sentiment === 'bullish'
                        ? 'text-green'
                        : a.sentiment === 'bearish'
                          ? 'text-red'
                          : 'text-muted'
                    }`}
                  >
                    {a.sentiment}
                  </span>
                )}
                {a.urgency && (
                  <span
                    className={`text-xs ${
                      a.urgency === 'high'
                        ? 'text-accent'
                        : a.urgency === 'medium'
                          ? 'text-yellow'
                          : 'text-muted'
                    }`}
                  >
                    {a.urgency} urgency
                  </span>
                )}
                {a.sector && (
                  <span className="text-xs text-muted">{a.sector}</span>
                )}
              </div>
              <p className="text-sm mt-2 font-medium">{a.headline}</p>
              <p className="text-xs text-muted mt-1">{a.reasoning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Framework reminder */}
      <div className="bg-card border border-card-border rounded-lg p-4 text-xs text-muted">
        <p className="font-bold text-foreground mb-2">
          The H.E.A.T. Signal Framework
        </p>
        <p>
          <strong className="text-green">SIGNAL</strong> = actionable,
          market-moving information that should influence positioning.
        </p>
        <p>
          <strong>NOISE</strong> = short-term distraction that feels important
          but won&apos;t move portfolios.
        </p>
        <p className="mt-2">
          From the article: &quot;The market isn&apos;t trading the press
          conference... it&apos;s trading the second-order consequences.&quot;
        </p>
      </div>
    </div>
  );
}
