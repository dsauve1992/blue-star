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

export function useChartData(
  symbol: string | null,
  exchange: string | null,
  interval: ChartInterval = "D",
  initialBars: number = 200,
  includeExtendedHours = true,
) {
  const [bars, setBars] = useState(initialBars);

  // Reset bars when symbol/interval changes
  useEffect(() => {
    setBars(initialBars);
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
    placeholderData: (previousData) => previousData,
  });

  const loadMore = useCallback(() => {
    setBars((prev) => prev + LOAD_MORE_INCREMENT);
  }, []);

  const isLoadingMore = query.isPlaceholderData && bars > initialBars;

  return {
    ...query,
    candles: query.data?.chartData?.candles as ChartCandleDto[] | undefined,
    loadMore,
    isLoadingMore,
  };
}
