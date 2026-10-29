import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChartDataClient,
  type ChartInterval,
  type ChartCandleDto,
} from "../api/chart-data.client";
import { MARKET_DATA_QUERY_KEYS } from "../constants/query-keys";

const chartDataClient = new ChartDataClient();

const LOAD_MORE_INCREMENT = 200;

export function useChartData(
  symbol: string | null,
  exchange: string | null,
  interval: ChartInterval = "D",
  initialBars: number = 200,
  includeExtendedHours = true,
) {
  const [bars, setBars] = useState(initialBars);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const candleCountBeforeLoadMoreRef = useRef<number | null>(null);

  // Reset bars when symbol/interval changes
  useEffect(() => {
    setBars(initialBars);
    setHasMoreHistory(true);
    candleCountBeforeLoadMoreRef.current = null;
  }, [symbol, exchange, interval, initialBars, includeExtendedHours]);

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
    const countBefore = candleCountBeforeLoadMoreRef.current;
    if (countBefore === null || !query.data || query.isPlaceholderData) return;
    candleCountBeforeLoadMoreRef.current = null;
    if (candleCount <= countBefore) setHasMoreHistory(false);
  }, [query.data, query.isPlaceholderData, candleCount]);

  const loadMore = useCallback(() => {
    if (!hasMoreHistory) return;
    candleCountBeforeLoadMoreRef.current = candleCount;
    setBars((prev) => prev + LOAD_MORE_INCREMENT);
  }, [hasMoreHistory, candleCount]);

  const isLoadingMore = query.isPlaceholderData && bars > initialBars;

  return {
    ...query,
    candles: query.data?.chartData?.candles as ChartCandleDto[] | undefined,
    loadMore,
    hasMoreHistory,
    isLoadingMore,
  };
}
