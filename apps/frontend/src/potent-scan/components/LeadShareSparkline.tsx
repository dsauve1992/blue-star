import type { LeadSharePoint } from "../api/potent-scan.client";

const WIDTH = 96;
const HEIGHT = 24;

export function LeadShareSparkline({ points }: { points: LeadSharePoint[] }) {
  const shares = points.map((point) => point.share);
  if (shares.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const step = shares.length > 1 ? WIDTH / (shares.length - 1) : 0;
  const coordinates = shares.map(
    (share, index) =>
      [
        shares.length > 1 ? index * step : WIDTH / 2,
        HEIGHT - share * HEIGHT,
      ] as const,
  );
  const last = shares[shares.length - 1];

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`-2 -2 ${WIDTH + 4} ${HEIGHT + 4}`}
      role="img"
      aria-label={`Lead share, latest ${Math.round(last * 100)}%`}
      className="overflow-visible text-success-600 dark:text-success-400"
    >
      <line
        x1={0}
        x2={WIDTH}
        y1={HEIGHT}
        y2={HEIGHT}
        className="stroke-slate-200 dark:stroke-slate-700"
        strokeWidth={1}
      />
      {coordinates.length > 1 && (
        <polyline
          points={coordinates.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )}
      <circle
        cx={coordinates[coordinates.length - 1][0]}
        cy={coordinates[coordinates.length - 1][1]}
        r={2}
        fill="currentColor"
      />
    </svg>
  );
}
