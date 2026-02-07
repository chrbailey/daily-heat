'use client';

interface RefreshBarProps {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  interval: number;
  onIntervalChange: (seconds: 15 | 30 | 60 | 300) => void;
  onRefreshNow: () => void;
}

const INTERVALS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
] as const;

export function RefreshBar({
  lastUpdated,
  isRefreshing,
  interval,
  onIntervalChange,
  onRefreshNow,
}: RefreshBarProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      {isRefreshing && (
        <span className="text-accent animate-pulse">Refreshing...</span>
      )}
      {lastUpdated && !isRefreshing && (
        <span>
          Updated {lastUpdated.toLocaleTimeString()}
        </span>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <span>Auto:</span>
        {INTERVALS.map((i) => (
          <button
            key={i.value}
            onClick={() => onIntervalChange(i.value)}
            className={`px-1.5 py-0.5 rounded text-xs ${
              interval === i.value
                ? 'bg-accent text-background'
                : 'bg-card-border hover:bg-card-border/80'
            }`}
          >
            {i.label}
          </button>
        ))}
        <button
          onClick={onRefreshNow}
          className="ml-1 px-2 py-0.5 rounded bg-card-border hover:bg-card-border/80"
        >
          Now
        </button>
      </div>
    </div>
  );
}
