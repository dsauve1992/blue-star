import type { ChartCandleDto } from "../api/chart-data.client";
import type { RSBenchmark } from "../components/TechnicalChart";

/**
 * Placeholder exchange for a GICS subindex (^SP500-XXXX) chart fetch. The Yahoo
 * chart service ignores `exchange` when retrieving candles, but `useChartData`
 * requires a truthy exchange to enable the query.
 */
export const GROUP_BENCHMARK_EXCHANGE = "INDEX";

/**
 * Assemble the RS benchmark list for a chart: always SPY (timing / divergence
 * frame), plus the stock's industry group (selection frame) when its candles
 * are available. Only the SPY line shows the larger price-divergence markers.
 *
 * Returns null when no benchmark has data, so callers can pass `rs={... ?? undefined}`.
 */
export function buildRsBenchmarks(params: {
  spyCandles: ChartCandleDto[] | undefined;
  spyLabel: string;
  groupCandles: ChartCandleDto[] | undefined;
  groupLabel: string | null | undefined;
}): RSBenchmark[] | null {
  const benchmarks: RSBenchmark[] = [];

  if (params.spyCandles && params.spyCandles.length > 0) {
    benchmarks.push({
      candles: params.spyCandles,
      label: params.spyLabel,
      showDivergence: true,
    });
  }

  if (
    params.groupLabel &&
    params.groupCandles &&
    params.groupCandles.length > 0
  ) {
    benchmarks.push({
      candles: params.groupCandles,
      label: params.groupLabel,
      showDivergence: false,
    });
  }

  return benchmarks.length > 0 ? benchmarks : null;
}
