import { useEffect, useRef, useState, useCallback } from 'react';

type PollingInterval = 15 | 30 | 60 | 300; // seconds

const STORAGE_KEY = 'heat-polling-interval';

function getStoredInterval(): PollingInterval {
  if (typeof window === 'undefined') return 30;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && [15, 30, 60, 300].includes(Number(stored))) {
    return Number(stored) as PollingInterval;
  }
  return 30;
}

export function usePolling(fetchFn: () => Promise<void>, deps: unknown[]) {
  const [interval, setIntervalSeconds] = useState<PollingInterval>(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Hydrate from localStorage
  useEffect(() => {
    setIntervalSeconds(getStoredInterval());
    return () => { mountedRef.current = false; };
  }, []);

  const doFetch = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsRefreshing(true);
    try {
      await fetchFn();
      if (mountedRef.current) setLastUpdated(new Date());
    } finally {
      if (mountedRef.current) setIsRefreshing(false);
    }
  }, [fetchFn]);

  // Initial fetch + restart timer when deps or interval change
  useEffect(() => {
    doFetch();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(doFetch, interval * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, interval, doFetch]);

  const changeInterval = (seconds: PollingInterval) => {
    setIntervalSeconds(seconds);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(seconds));
    }
  };

  const refreshNow = () => doFetch();

  return { interval, changeInterval, lastUpdated, isRefreshing, refreshNow };
}
