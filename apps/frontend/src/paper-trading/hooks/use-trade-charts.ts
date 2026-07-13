import { useQuery } from "@tanstack/react-query";
import { TradeChartClient } from "../api/trade-chart.client";
import { PAPER_TRADING_QUERY_KEYS } from "../constants/query-keys";
import type { PaperTrade } from "../api/paper-trading.types";
import {
  dailyWindow,
  intradayWindow,
  isIntradayAvailable,
  sliceDailyToWindow,
  sliceIntradayToEntry,
} from "../utils/trade-window";

const tradeChartClient = new TradeChartClient();

export function useTradeDailyCandles(trade: PaperTrade | null) {
  const query = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: PAPER_TRADING_QUERY_KEYS.dailyChart(trade?.id ?? "none"),
    queryFn: async () => {
      if (!trade) return [];
      const { startDate, endDate } = dailyWindow(trade.marketDate, trade.closedAt);
      const candles = await tradeChartClient.getDaily(trade.ticker, startDate, endDate);
      return sliceDailyToWindow(candles, trade.marketDate);
    },
    enabled: !!trade,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return { ...query, candles: query.data ?? [] };
}

export function useTradeIntradayCandles(trade: PaperTrade | null) {
  const query = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: PAPER_TRADING_QUERY_KEYS.intradayChart(trade?.id ?? "none"),
    queryFn: async () => {
      if (!trade) return [];
      const { startDate, endDate } = intradayWindow(trade.openedAt, trade.closedAt);
      const candles = await tradeChartClient.getIntraday(trade.ticker, startDate, endDate);
      return sliceIntradayToEntry(candles, trade.openedAt);
    },
    enabled: !!trade && isIntradayAvailable(trade.openedAt),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return { ...query, candles: query.data ?? [] };
}
