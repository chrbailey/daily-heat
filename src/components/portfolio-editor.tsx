'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/lib/portfolio-store';
import type { Position } from '@/types/portfolio';

export function PortfolioEditor() {
  const { positions, addPosition, removePosition, addCustomTicker, customTickers, removeCustomTicker } =
    usePortfolioStore();
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newCost, setNewCost] = useState('');
  const [customTickerInput, setCustomTickerInput] = useState('');

  const handleAddPosition = () => {
    if (!newTicker || !newShares || !newCost) return;
    addPosition({
      ticker: newTicker.toUpperCase(),
      shares: Number(newShares),
      costBasis: Number(newCost),
    });
    setNewTicker('');
    setNewShares('');
    setNewCost('');
  };

  const handleAddCustomTicker = () => {
    if (!customTickerInput) return;
    addCustomTicker(customTickerInput.toUpperCase());
    setCustomTickerInput('');
  };

  return (
    <div className="space-y-4">
      {/* Add position form */}
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-xs text-muted mb-1">Ticker</label>
          <input
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="bg-card border border-card-border rounded px-3 py-2 text-sm font-mono w-24 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Shares</label>
          <input
            value={newShares}
            onChange={(e) => setNewShares(e.target.value)}
            placeholder="100"
            type="number"
            className="bg-card border border-card-border rounded px-3 py-2 text-sm font-mono w-24 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Cost Basis</label>
          <input
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            placeholder="150.00"
            type="number"
            step="0.01"
            className="bg-card border border-card-border rounded px-3 py-2 text-sm font-mono w-28 focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={handleAddPosition}
          className="bg-accent text-background px-4 py-2 rounded text-sm font-medium hover:bg-accent-muted transition-colors"
        >
          Add
        </button>
      </div>

      {/* Positions table */}
      {positions.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs text-left border-b border-card-border">
              <th className="py-2">Ticker</th>
              <th className="py-2">Shares</th>
              <th className="py-2">Cost Basis</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p: Position) => (
              <tr key={p.ticker} className="border-b border-card-border/50">
                <td className="py-2 font-mono font-bold">{p.ticker}</td>
                <td className="py-2 font-mono">{p.shares}</td>
                <td className="py-2 font-mono">${p.costBasis.toFixed(2)}</td>
                <td className="py-2">
                  <button
                    onClick={() => removePosition(p.ticker)}
                    className="text-red text-xs hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Custom tickers */}
      <div className="pt-4 border-t border-card-border">
        <p className="text-xs text-muted mb-2">
          Add custom tickers (beyond Mag 7 + IBIT)
        </p>
        <div className="flex gap-2 items-center">
          <input
            value={customTickerInput}
            onChange={(e) => setCustomTickerInput(e.target.value.toUpperCase())}
            placeholder="NXT"
            className="bg-card border border-card-border rounded px-3 py-2 text-sm font-mono w-24 focus:outline-none focus:border-accent"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTicker()}
          />
          <button
            onClick={handleAddCustomTicker}
            className="bg-card border border-card-border px-3 py-2 rounded text-sm hover:border-accent transition-colors"
          >
            Add Ticker
          </button>
          {customTickers.map((t: string) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 bg-card-border px-2 py-1 rounded text-xs font-mono"
            >
              {t}
              <button
                onClick={() => removeCustomTicker(t)}
                className="text-red hover:text-red/80"
              >
                x
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
