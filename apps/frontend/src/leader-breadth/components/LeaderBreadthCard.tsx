import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../global/design-system';
import { useLeaderBreadth } from '../hooks/use-leader-breadth';
import type {
  BreadthDirection,
  BreadthRegime,
  BreadthSeriesPoint,
} from '../api/leader-breadth.types';

const regimeBadgeVariant: Record<
  BreadthRegime,
  'success' | 'warning' | 'danger'
> = {
  GREEN: 'success',
  YELLOW: 'warning',
  RED: 'danger',
};

const regimeLabel: Record<BreadthRegime, string> = {
  GREEN: 'Risk-on',
  YELLOW: 'Mixed',
  RED: 'Deteriorating',
};

const regimeDescription: Record<BreadthRegime, string> = {
  GREEN: 'Leadership is broad and expanding — favorable for new positions.',
  YELLOW: 'Leadership is transitional — size down and be selective.',
  RED: 'Leadership is contracting — defensive; avoid new risk.',
};

const directionGlyph: Record<BreadthDirection, string> = {
  RISING: '▲',
  FALLING: '▼',
  FLAT: '▬',
};

const sparkStroke: Record<BreadthRegime, string> = {
  GREEN: 'stroke-green-500',
  YELLOW: 'stroke-amber-500',
  RED: 'stroke-red-500',
};

function Sparkline({
  series,
  regime,
}: {
  series: BreadthSeriesPoint[];
  regime: BreadthRegime;
}) {
  if (series.length < 2) return null;

  const width = 220;
  const height = 48;
  const pad = 2;
  const counts = series.map((p) => p.leaderCount);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const span = max - min || 1;

  const points = series
    .map((p, i) => {
      const x = pad + (i / (series.length - 1)) * (width - pad * 2);
      const y =
        height - pad - ((p.leaderCount - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-12"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={2}
        className={sparkStroke[regime]}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LeaderBreadthCard() {
  const { data, isLoading, isError } = useLeaderBreadth();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Leader Breadth</CardTitle>
          {data?.regime && (
            <Badge variant={regimeBadgeVariant[data.regime]}>
              {regimeLabel[data.regime]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : isError ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Couldn’t load leader breadth.
          </p>
        ) : !data || data.regime === null || data.leaderCount === null ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No leader scan has run yet. The gauge appears after the first weekly
            scan.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-3xl font-bold text-slate-900 dark:text-slate-50">
                {data.leaderCount}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                leaders
                {data.direction && (
                  <span className="ml-1">
                    {directionGlyph[data.direction]}
                  </span>
                )}
              </span>
              {data.breadthMa !== null && (
                <span className="ml-auto font-mono text-sm text-slate-500 dark:text-slate-400">
                  20-wk avg {data.breadthMa.toFixed(0)}
                </span>
              )}
            </div>

            <Sparkline series={data.series} regime={data.regime} />

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {regimeDescription[data.regime]}
            </p>

            {data.provisional && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Provisional — based on {data.sampleSize} scan
                {data.sampleSize === 1 ? '' : 's'}; needs more weekly history to
                be a reliable signal.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
