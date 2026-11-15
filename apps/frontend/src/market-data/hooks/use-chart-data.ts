import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChartDataClient,
  type ChartInterval,
  type ChartCandleDto,
} from "../api/chart-data.client";
import { MARKET_DATA_QUERY_KEYS } from "../constants/query-keys";

const chartDataClient = new ChartDataClient();

const LOAD_MORE_INCREMENT = 200;

interface LoadMoreState {
  key: string;
  extraBars: number;
  hasMoreHistory: boolean;
  candleCountBeforeLoadMore: number | null;
}

const freshLoadMoreState = (key: string): LoadMoreState => ({
  key,
  extraBars: 0,
  hasMoreHistory: true,
  candleCountBeforeLoadMore: null,
});

export function useChartData(
  symbol: string | null,
  exchange: string | null,
  interval: ChartInterval = "D",
  initialBars: number = 200,
  includeExtendedHours = true,
) {
  const key = JSON.stringify([
    symbol,
    exchange,
    interval,
    initialBars,
    includeExtendedHours,
  ]);
  const [storedLoadMoreState, setLoadMoreState] = useState(() =>
    freshLoadMoreState(key),
  );
  const isStale = storedLoadMoreState.key !== key;
  const loadMoreState = isStale
    ? freshLoadMoreState(key)
    : storedLoadMoreState;
  if (isStale) setLoadMoreState(loadMoreState);
  const { hasMoreHistory, candleCountBeforeLoadMore } = loadMoreState;
  const bars = initialBars + loadMoreState.extraBars;

  const query = useQuery({
    queryKey: MARKET_DATA_QUERY_KEYS.chart(
      symbol ?? "",
      exchange ?? "",
      interval,
      bars,
      includeExtendedHours,
    ),
    queryFn: () =>
      chartDataClient.getChartData(
        symbol!,
        exchange!,
        interval,
        bars,
        includeExtendedHours,
      ),
    enabled: !!symbol && !!exchange,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey;
      const isSameChart =
        previousKey?.[2] === (symbol ?? "") &&
        previousKey?.[3] === (exchange ?? "") &&
        previousKey?.[4] === interval &&
        previousKey?.[6] === includeExtendedHours;
      return isSameChart ? previousData : undefined;
    },
  });

  const candleCount = query.data?.chartData?.candles.length ?? 0;

  useEffect(() => {
    if (
      candleCountBeforeLoadMore === null ||
      !query.data ||
      query.isPlaceholderData
    )
      return;
    setLoadMoreState({
      ...loadMoreState,
      candleCountBeforeLoadMore: null,
      hasMoreHistory: candleCount > candleCountBeforeLoadMore,
    });
  }, [
    query.data,
    query.isPlaceholderData,
    candleCount,
    candleCountBeforeLoadMore,
    loadMoreState,
  ]);

  const loadMore = useCallback(() => {
    if (!hasMoreHistory) return;
    setLoadMoreState({
      ...loadMoreState,
      extraBars: loadMoreState.extraBars + LOAD_MORE_INCREMENT,
      candleCountBeforeLoadMore: candleCount,
    });
  }, [hasMoreHistory, loadMoreState, candleCount]);

  const isLoadingMore = query.isPlaceholderData && bars > initialBars;

  return {
    ...query,
    candles: query.data?.chartData?.candles as ChartCandleDto[] | undefined,
    loadMore,
    hasMoreHistory,
    isLoadingMore,
  };
}
