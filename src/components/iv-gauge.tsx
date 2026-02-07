'use client';

export function IVGauge({ percentile }: { percentile: number }) {
  const clamp = Math.max(0, Math.min(100, percentile));
  const color =
    clamp >= 70 ? 'bg-green' : clamp >= 40 ? 'bg-yellow' : 'bg-red';
  const label =
    clamp >= 70
      ? 'Rich — good to sell'
      : clamp >= 40
        ? 'Moderate'
        : 'Cheap — consider skipping';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted">
        <span>IV Percentile</span>
        <span className="font-mono">{clamp}%</span>
      </div>
      <div className="h-3 bg-card-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${clamp}%` }}
        />
      </div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
