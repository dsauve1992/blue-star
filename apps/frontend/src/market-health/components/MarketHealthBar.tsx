import { useState } from 'react';
import { useMarketHealth } from '../hooks/use-market-health';
import type { MarketHealthStatus } from '../api/market-health.types';

const statusColorMap: Record<MarketHealthStatus, string> = {
  GOOD: 'bg-green-500',
  WARNING: 'bg-amber-500',
  BAD: 'bg-red-500',
};

const statusLabelMap: Record<MarketHealthStatus, string> = {
  GOOD: 'Market conditions favorable for trading',
  WARNING: 'Market conditions mixed — proceed with caution',
  BAD: 'Adverse market conditions — avoid new positions',
};

export function MarketHealthBar() {
  const { data, isLoading } = useMarketHealth();
  const [isLabelOpen, setIsLabelOpen] = useState(false);

  if (isLoading) {
    return <div className="h-1 bg-slate-200 dark:bg-slate-700 animate-pulse" />;
  }

  if (!data) {
    return null;
  }

  const asOf = new Date(data.computedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const label = `${statusLabelMap[data.status]} (as of ${asOf})`;

  return (
    <div className="relative z-50">
      <div
        tabIndex={0}
        role="status"
        className={`relative h-1 ${statusColorMap[data.status]} transition-colors duration-300 after:absolute after:inset-x-0 after:top-0 after:h-4 after:content-['']`}
        aria-label={label}
        onClick={() => setIsLabelOpen(true)}
        onMouseEnter={() => setIsLabelOpen(true)}
        onMouseLeave={() => setIsLabelOpen(false)}
        onFocus={() => setIsLabelOpen(true)}
        onBlur={() => setIsLabelOpen(false)}
        onKeyDown={(event) => event.key === 'Escape' && setIsLabelOpen(false)}
      />
      {isLabelOpen && (
        <div
          aria-hidden="true"
          className="absolute left-16 top-2 flex max-w-[calc(100vw-5rem)] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${statusColorMap[data.status]}`}
          />
          {label}
        </div>
      )}
    </div>
  );
}
