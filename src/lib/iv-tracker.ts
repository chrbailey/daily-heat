// IV Percentile Tracker
// Records daily ATM implied volatility snapshots and computes percentile rank.
// Persisted to localStorage so it accumulates data across sessions.
//
// The article's core question: "Is IV cheap or rich?"
// Answer: compare today's ATM IV to the rolling 252-day distribution.

import type { TradierOptionContract } from '@/types/tradier';

interface IVSnapshot {
  timestamp: number;
  iv: number;
}

const STORAGE_KEY = 'heat-iv-history';
const MAX_SAMPLES = 252; // 1 year of trading days

// In-memory store (hydrated from localStorage on client)
let history: Record<string, IVSnapshot[]> = {};

export function hydrateIVHistory() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) history = JSON.parse(raw);
  } catch {
    history = {};
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function recordIVSnapshot(ticker: string, atmIV: number) {
  if (!history[ticker]) history[ticker] = [];
  const snapshots = history[ticker];

  // Only one snapshot per day
  const today = new Date().toDateString();
  const last = snapshots[snapshots.length - 1];
  if (last && new Date(last.timestamp).toDateString() === today) {
    last.iv = atmIV; // update today's
  } else {
    snapshots.push({ timestamp: Date.now(), iv: atmIV });
  }

  if (snapshots.length > MAX_SAMPLES) snapshots.shift();
  persist();
}

export function getIVPercentile(ticker: string, currentIV: number): number {
  const snapshots = history[ticker];
  if (!snapshots || snapshots.length < 5) {
    // Not enough history — use 50 as neutral default
    return 50;
  }

  const sorted = snapshots.map((s) => s.iv).sort((a, b) => a - b);
  const rank = sorted.filter((iv) => iv < currentIV).length;
  return Math.round(((rank + 0.5) / sorted.length) * 100);
}

export function getATMImpliedVolatility(
  chain: TradierOptionContract[],
  stockPrice: number,
): number {
  // Average the ATM call and put mid_iv
  const calls = chain.filter((c) => c.type === 'call' && c.greeks);
  const puts = chain.filter((c) => c.type === 'put' && c.greeks);

  if (!calls.length || !puts.length) return 0.30; // fallback

  const atmCall = calls.reduce((closest, c) =>
    Math.abs(c.strike - stockPrice) < Math.abs(closest.strike - stockPrice)
      ? c
      : closest,
  );
  const atmPut = puts.reduce((closest, c) =>
    Math.abs(c.strike - stockPrice) < Math.abs(closest.strike - stockPrice)
      ? c
      : closest,
  );

  const callIV = atmCall.greeks?.mid_iv ?? 0.30;
  const putIV = atmPut.greeks?.mid_iv ?? 0.30;
  return (callIV + putIV) / 2;
}
