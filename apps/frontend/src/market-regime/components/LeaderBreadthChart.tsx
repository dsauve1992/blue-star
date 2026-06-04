import { useEffect, useMemo, useRef } from 'react';
import {
  createChart,
  LineSeries,
  ColorType,
  type IChartApi,
  type LineData,
  type Time,
} from 'lightweight-charts';
import { useTheme } from '../../global/design-system';
import type { BreadthSeriesPoint } from '../api/market-regime.types';

interface LeaderBreadthChartProps {
  series: BreadthSeriesPoint[];
}

const MA_PERIOD = 20;

// Color scheme follows the project's chart conventions (see lightweight-charts skill):
// leader count uses the RS-line green, the moving average uses the RS-SMA amber.
const LEADER_COLOR = '#22c55e'; // green-500
const MA_COLOR = '#f59e0b'; // amber-500

/** Convert an ISO timestamp to the chart's 'YYYY-MM-DD' time key. */
function toTimeKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Trailing simple moving average; null until the window is warm. */
function trailingMa(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function LeaderBreadthChart({ series }: LeaderBreadthChartProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const sorted = useMemo(
    () =>
      [...series].sort((a, b) =>
        a.computedAt < b.computedAt ? -1 : a.computedAt > b.computedAt ? 1 : 0,
      ),
    [series],
  );

  useEffect(() => {
    if (!containerRef.current || sorted.length < 2) return;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(203, 213, 225, 0.5)';
    const borderColor = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.8)';

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: false },
    });
    chartRef.current = chart;

    const times = sorted.map((p) => toTimeKey(p.computedAt));
    const counts = sorted.map((p) => p.leaderCount);
    const maValues = trailingMa(counts, MA_PERIOD);

    const leaderData: LineData<Time>[] = sorted.map((p, i) => ({
      time: times[i] as Time,
      value: counts[i],
    }));

    const maData: LineData<Time>[] = maValues
      .map((v, i) => (v === null ? null : { time: times[i] as Time, value: v }))
      .filter((d): d is LineData<Time> => d !== null);

    const leaderSeries = chart.addSeries(LineSeries, {
      color: LEADER_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'Leaders',
    });
    leaderSeries.setData(leaderData);

    const maSeries = chart.addSeries(LineSeries, {
      color: MA_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      title: `${MA_PERIOD}d avg`,
    });
    maSeries.setData(maData);

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [sorted, theme]);

  if (sorted.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-200 dark:border-slate-700 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Not enough history yet — the moving average needs ~20 trading days to
        warm up.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="h-48 w-full" />
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded"
            style={{ backgroundColor: LEADER_COLOR }}
          />
          Leaders (RS ≥ 90)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded"
            style={{ backgroundColor: MA_COLOR }}
          />
          {MA_PERIOD}-day avg
        </span>
      </div>
    </div>
  );
}
