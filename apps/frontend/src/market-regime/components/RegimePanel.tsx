import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '../../global/design-system';
import { useMarketRegime } from '../hooks/use-market-regime';
import type {
  BreadthSignal,
  MarketHealthStatus,
  RegimeState,
} from '../api/market-regime.types';
import { LeaderBreadthChart } from './LeaderBreadthChart';
import { ExposureBandCard } from './ExposureBandCard';

const stateBadgeClassMap: Record<RegimeState, string> = {
  GREEN: 'bg-green-500',
  YELLOW: 'bg-amber-500',
  RED: 'bg-red-500',
};

const stateLabelMap: Record<RegimeState, string> = {
  GREEN: 'Favorable — press exposure',
  YELLOW: 'Mixed — proceed with caution',
  RED: 'Adverse — cash-biased',
};

const healthClassMap: Record<MarketHealthStatus, string> = {
  GOOD: 'text-green-600 dark:text-green-400',
  WARNING: 'text-amber-600 dark:text-amber-400',
  BAD: 'text-red-600 dark:text-red-400',
};

const healthLabelMap: Record<MarketHealthStatus, string> = {
  GOOD: 'Good',
  WARNING: 'Warning',
  BAD: 'Bad',
};

const breadthClassMap: Record<BreadthSignal, string> = {
  EXPANDING: 'text-green-600 dark:text-green-400',
  NEUTRAL: 'text-slate-500 dark:text-slate-400',
  CONTRACTING: 'text-red-600 dark:text-red-400',
};

function BreadthIcon({ signal }: { signal: BreadthSignal }) {
  if (signal === 'EXPANDING') return <TrendingUp className="h-4 w-4" />;
  if (signal === 'CONTRACTING') return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

function SignalRow({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2"
      title={tooltip}
    >
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

export function RegimePanel() {
  const { data, isLoading, isError } = useMarketRegime();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Regime</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="py-6">
            <LoadingSpinner label="Loading market regime..." />
          </div>
        )}

        {!isLoading && (isError || !data) && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Market regime not yet computed — check back after the next end-of-day
            run.
          </p>
        )}

        {!isLoading && !isError && data && (
          <>
            {/* Composite state badge */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold text-white ${stateBadgeClassMap[data.state]}`}
              >
                {data.state}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {stateLabelMap[data.state]}
              </span>
            </div>

            {/* Sub-signals */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SignalRow
                label="SPY Trend"
                tooltip="Top-down market health from SPY's EMA trend."
              >
                <span
                  className={`text-sm font-semibold ${healthClassMap[data.marketHealthStatus]}`}
                >
                  {healthLabelMap[data.marketHealthStatus]}
                </span>
              </SignalRow>

              <SignalRow
                label="Leader Breadth"
                tooltip="Number of strong-RS leaders (rating ≥ 90) vs its 20-day moving average. Above the average = leadership expanding; below = contracting."
              >
                <span className="font-mono text-sm text-slate-700 dark:text-slate-200">
                  {data.leaderCount} leaders vs {data.leaderCountMa} avg
                </span>
                <span
                  className={`flex items-center ${breadthClassMap[data.breadthSignal]}`}
                  title={data.breadthSignal}
                >
                  <BreadthIcon signal={data.breadthSignal} />
                </span>
              </SignalRow>
            </div>

            {/* Leader breadth history */}
            <LeaderBreadthChart series={data.breadthSeries} />

            {/* Exposure guidance */}
            <ExposureBandCard band={data.exposureBand} state={data.state} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
