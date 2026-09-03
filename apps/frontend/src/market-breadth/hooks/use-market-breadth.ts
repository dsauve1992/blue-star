import { useQuery } from "@tanstack/react-query";
import { MarketBreadthClient } from "../api/market-breadth.client";
import { MARKET_BREADTH_QUERY_KEYS } from "../constants/query-keys";

const marketBreadthClient = new MarketBreadthClient();

export function useMarketBreadth(limit?: number) {
  return useQuery({
    queryKey: MARKET_BREADTH_QUERY_KEYS.list(limit),
    queryFn: () => marketBreadthClient.getBreadth(limit),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
