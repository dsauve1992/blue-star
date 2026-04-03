import { useQuery } from "@tanstack/react-query";
import { MarketDataProfileClient } from "../api/market-data-profile.client";
import { MARKET_DATA_QUERY_KEYS } from "../constants/query-keys";

const marketDataProfileClient = new MarketDataProfileClient();

export function useCompanyProfile(symbol: string | null) {
  return useQuery({
    queryKey: MARKET_DATA_QUERY_KEYS.profile(symbol ?? ""),
    queryFn: () => marketDataProfileClient.getCompanyProfile(symbol!),
    enabled: !!symbol,
    staleTime: 24 * 60 * 60 * 1000, // 24h - sector/industry rarely changes
  });
}
