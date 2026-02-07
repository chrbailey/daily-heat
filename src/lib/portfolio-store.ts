import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Position } from '@/types/portfolio';
import { DEFAULT_TICKERS } from './constants';

interface PortfolioState {
  positions: Position[];
  customTickers: string[];
  addPosition: (pos: Position) => void;
  updatePosition: (ticker: string, updates: Partial<Position>) => void;
  removePosition: (ticker: string) => void;
  addCustomTicker: (ticker: string) => void;
  removeCustomTicker: (ticker: string) => void;
  getAllTickers: () => string[];
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      positions: [],
      customTickers: [],

      addPosition: (pos) =>
        set((s) => ({
          positions: [...s.positions.filter((p) => p.ticker !== pos.ticker), pos],
        })),

      updatePosition: (ticker, updates) =>
        set((s) => ({
          positions: s.positions.map((p) =>
            p.ticker === ticker ? { ...p, ...updates } : p,
          ),
        })),

      removePosition: (ticker) =>
        set((s) => ({
          positions: s.positions.filter((p) => p.ticker !== ticker),
        })),

      addCustomTicker: (ticker) =>
        set((s) => ({
          customTickers: s.customTickers.includes(ticker)
            ? s.customTickers
            : [...s.customTickers, ticker],
        })),

      removeCustomTicker: (ticker) =>
        set((s) => ({
          customTickers: s.customTickers.filter((t) => t !== ticker),
        })),

      getAllTickers: () => {
        const custom = get().customTickers;
        return [...DEFAULT_TICKERS, ...custom.filter((t) => !DEFAULT_TICKERS.includes(t as typeof DEFAULT_TICKERS[number]))];
      },
    }),
    { name: 'daily-heat-portfolio' },
  ),
);
