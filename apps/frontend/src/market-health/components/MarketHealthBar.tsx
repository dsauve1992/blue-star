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

  if (isLoading) {
    return <div className="h-1 bg-slate-200 dark:bg-slate-700 animate-pulse" />;
  }

  if (!data) {
    return null;
  }

  return (
    <div
      className={`h-1 ${statusColorMap[data.status]} transition-colors duration-300`}
      role="status"
      aria-label={statusLabelMap[data.status]}
      title={statusLabelMap[data.status]}
    />
  );
}
