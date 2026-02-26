import { useQuery } from '@tanstack/react-query';
import { MarketHealthClient } from '../api/market-health.client';
import { MARKET_HEALTH_QUERY_KEYS } from '../constants/query-keys';

const marketHealthClient = new MarketHealthClient();

export function useMarketHealth() {
  return useQuery({
    queryKey: MARKET_HEALTH_QUERY_KEYS.current(),
    queryFn: () => marketHealthClient.getMarketHealth(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
