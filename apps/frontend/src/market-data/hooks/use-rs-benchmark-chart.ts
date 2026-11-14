import { useCallback } from "react";
import type { ChartInterval } from "../api/chart-data.client";
import {
  buildRsBenchmarks,
  GROUP_BENCHMARK_EXCHANGE,
} from "../utils/rs-benchmarks";
import { useChartData } from "./use-chart-data";

const BENCHMARK_SYMBOL = "SPY";
const BENCHMARK_EXCHANGE = "AMEX";

interface UseRsBenchmarkChartParams {
  symbol: string | null;
  exchange: string | null;
  groupSymbol: string | null;
  groupLabel: string | null | undefined;
  interval: ChartInterval;
  includeExtendedHours: boolean;
}

export function useRsBenchmarkChart({
  symbol,
  exchange,
  groupSymbol,
  groupLabel,
  interval,
  includeExtendedHours,
}: UseRsBenchmarkChartParams) {
  const isWeekly = interval === "W";
  const bars = isWeekly ? 156 : 520;

  const {
    candles,
    isLoading,
    error,
    refetch,
    loadMore: loadMoreStock,
    isLoadingMore: isLoadingMoreStock,
  } = useChartData(symbol, exchange, interval, bars, includeExtendedHours);
  const {
    candles: spyCandles,
    loadMore: loadMoreSpy,
    isLoadingMore: isLoadingMoreSpy,
  } = useChartData(
    BENCHMARK_SYMBOL,
    BENCHMARK_EXCHANGE,
    interval,
    bars,
    includeExtendedHours,
  );
  const { candles: groupCandles, loadMore: loadMoreGroup } = useChartData(
    groupSymbol,
    groupSymbol ? GROUP_BENCHMARK_EXCHANGE : null,
    interval,
    bars,
    includeExtendedHours,
  );

  const loadMore = useCallback(() => {
    loadMoreStock();
    loadMoreSpy();
    loadMoreGroup();
  }, [loadMoreStock, loadMoreSpy, loadMoreGroup]);

  const benchmarks = buildRsBenchmarks({
    spyCandles,
    spyLabel: BENCHMARK_SYMBOL,
    groupCandles,
    groupLabel,
  });

  return {
    candles,
    isLoading,
    error,
    refetch,
    loadMore,
    isLoadingMore: isLoadingMoreStock || isLoadingMoreSpy,
    rs: benchmarks
      ? { benchmarks, smaPeriod: 50, lookback: isWeekly ? 52 : 260 }
      : undefined,
    visibleBars: isWeekly ? 52 : 130,
  };
}
