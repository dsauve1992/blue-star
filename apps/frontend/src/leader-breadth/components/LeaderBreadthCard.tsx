import { useState } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../global/design-system";
import { useLeaderBreadth } from "../hooks/use-leader-breadth";
import type {
  BreadthDirection,
  BreadthRegime,
  BreadthSeriesPoint,
} from "../api/leader-breadth.types";

const regimeBadgeVariant: Record<
  BreadthRegime,
  "success" | "warning" | "danger"
> = {
  GREEN: "success",
  YELLOW: "warning",
  RED: "danger",
};

const regimeLabel: Record<BreadthRegime, string> = {
  GREEN: "Risk-on",
  YELLOW: "Mixed",
  RED: "Deteriorating",
};

const regimeDescription: Record<BreadthRegime, string> = {
  GREEN: "Leadership is broad and expanding — favorable for new positions.",
  YELLOW: "Leadership is transitional — size down and be selective.",
  RED: "Leadership is contracting — defensive; avoid new risk.",
};

const directionGlyph: Record<BreadthDirection, string> = {
  RISING: "▲",
  FALLING: "▼",
  FLAT: "▬",
};

const lineStroke: Record<BreadthRegime, string> = {
  GREEN: "stroke-green-500",
  YELLOW: "stroke-amber-500",
  RED: "stroke-red-500",
};

const dotFill: Record<BreadthRegime, string> = {
  GREEN: "fill-green-500",
  YELLOW: "fill-amber-500",
  RED: "fill-red-500",
};

function formatTickDate(scanDate: string): string {
  const date = new Date(`${scanDate}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function BreadthChart({
  series,
  regime,
}: {
  series: BreadthSeriesPoint[];
  regime: BreadthRegime;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (series.length < 2) return null;

  const width = 720;
  const height = 280;
  const padLeft = 40;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const counts = series.map((p) => p.leaderCount);
  const maValues = series.map((p) => p.leaderCountMa);
  const min = Math.min(...counts, ...maValues);
  const max = Math.max(...counts, ...maValues);
  const span = max - min || 1;

  const xAt = (i: number) => padLeft + (i / (series.length - 1)) * plotWidth;
  const yAt = (value: number) =>
    padTop + plotHeight - ((value - min) / span) * plotHeight;

  const points = series.map((p, i) => ({
    x: xAt(i),
    y: yAt(p.leaderCount),
    point: p,
  }));

  const linePoints = points
    .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const maLinePoints = series
    .map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.leaderCountMa).toFixed(1)}`)
    .join(" ");

  const yTicks = [min, min + span / 2, max];
  const tickIndices = Array.from(
    new Set([0, Math.floor((series.length - 1) / 2), series.length - 1]),
  );

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-64 sm:h-72"
        preserveAspectRatio="none"
        role="img"
        aria-label="Leader count over time, with 20-week moving average"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={yAt(tick)}
              y2={yAt(tick)}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth={1}
            />
            <text
              x={padLeft - 8}
              y={yAt(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-400 dark:fill-slate-500 font-mono"
              fontSize={11}
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={padTop}
            y2={height - padBottom}
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth={1}
          />
        )}

        <polyline
          points={maLinePoints}
          fill="none"
          strokeWidth={1.5}
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <text
          x={width - padRight}
          y={yAt(series[series.length - 1].leaderCountMa) - 6}
          textAnchor="end"
          className="fill-slate-500 dark:fill-slate-400"
          fontSize={11}
        >
          20-wk MA
        </text>

        <polyline
          points={linePoints}
          fill="none"
          strokeWidth={2}
          className={lineStroke[regime]}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map(({ x, y, point }, i) => (
          <g key={point.scanDate}>
            <circle
              cx={x}
              cy={y}
              r={i === hoverIndex ? 4 : i === points.length - 1 ? 3 : 2}
              className={dotFill[regime]}
            />
            {/* Larger transparent hit target for easier hovering. */}
            <circle
              cx={x}
              cy={y}
              r={10}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onFocus={() => setHoverIndex(i)}
              tabIndex={0}
              role="button"
              aria-label={`${point.scanDate}: ${point.leaderCount} leaders, MA ${point.leaderCountMa.toFixed(1)}`}
            />
          </g>
        ))}

        {tickIndices.map((i) => (
          <text
            key={i}
            x={xAt(i)}
            y={height - 6}
            textAnchor={
              i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"
            }
            className="fill-slate-400 dark:fill-slate-500"
            fontSize={11}
          >
            {formatTickDate(series[i].scanDate)}
          </text>
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800"
          style={{
            left: `${(hovered.x / width) * 100}%`,
            top: `${Math.max((hovered.y / height) * 100 - 12, 2)}%`,
          }}
        >
          <div className="font-medium text-slate-900 dark:text-slate-50">
            {formatTickDate(hovered.point.scanDate)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span
              className={`inline-block h-2 w-2 rounded-full ${dotFill[regime]}`}
            />
            {hovered.point.leaderCount} leaders
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full border border-dashed border-slate-400 dark:border-slate-500" />
            {hovered.point.leaderCountMa.toFixed(1)} MA
          </div>
        </div>
      )}
    </div>
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
                  <span className="ml-1">{directionGlyph[data.direction]}</span>
                )}
              </span>
              {data.breadthMa !== null && (
                <span className="ml-auto font-mono text-sm text-slate-500 dark:text-slate-400">
                  20-wk avg {data.breadthMa.toFixed(0)}
                </span>
              )}
            </div>

            <BreadthChart series={data.series} regime={data.regime} />

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {regimeDescription[data.regime]}
            </p>

            {data.provisional && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Provisional — based on {data.sampleSize} scan
                {data.sampleSize === 1 ? "" : "s"}; needs more weekly history to
                be a reliable signal.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
