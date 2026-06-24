import { useQuery } from "@tanstack/react-query";
import { PaperTradingClient } from "../api/paper-trading.client";
import { PAPER_TRADING_QUERY_KEYS } from "../constants/query-keys";
import type { PaperTradeStatus } from "../api/paper-trading.types";

const paperTradingClient = new PaperTradingClient();

export function usePaperTradingStats() {
  return useQuery({
    queryKey: PAPER_TRADING_QUERY_KEYS.stats(),
    queryFn: () => paperTradingClient.getStats(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function usePaperTrades(status?: PaperTradeStatus) {
  return useQuery({
    queryKey: PAPER_TRADING_QUERY_KEYS.trades(status),
    queryFn: () => paperTradingClient.getTrades(status),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
