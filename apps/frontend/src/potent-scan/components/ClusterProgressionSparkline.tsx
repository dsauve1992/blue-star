import type { DailyTierCounts } from "../api/potent-scan.client";
import { TIER_SERIES } from "../constants/tier-series";

const WIDTH = 100;
const HEIGHT = 40;

export function ClusterProgressionSparkline({
  days,
}: {
  days: DailyTierCounts[];
}) {
  if (days.length === 0) {
    return (
      <p className="flex h-12 items-center text-xs text-slate-600 dark:text-slate-400">
        No tier data yet
      </p>
    );
  }

  const plotted = days.length === 1 ? [days[0], days[0]] : days;
  const peak = Math.max(...plotted.map(TIER_SERIES[0].total));
  const x = (index: number) => (index / (plotted.length - 1)) * WIDTH;
  const y = (count: number) => HEIGHT - (count / peak) * HEIGHT;
  const latest = days[days.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Members per tier over ${days.length} sessions, latest ${latest.lead} Lead, ${latest.mediocre} Mediocre, ${latest.lag} Lag`}
      className="h-12 w-full rounded-sm"
    >
      {TIER_SERIES.map((tier) => (
        <polygon
          key={tier.label}
          fill={tier.color}
          points={[
            `0,${HEIGHT}`,
            ...plotted.map((day, index) => `${x(index)},${y(tier.total(day))}`),
            `${WIDTH},${HEIGHT}`,
          ].join(" ")}
        />
      ))}
    </svg>
  );
}
