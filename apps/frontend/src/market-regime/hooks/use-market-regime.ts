import { useQuery } from '@tanstack/react-query';
import { MarketRegimeClient } from '../api/market-regime.client';
import { MARKET_REGIME_QUERY_KEYS } from '../constants/query-keys';

const marketRegimeClient = new MarketRegimeClient();

export function useMarketRegime() {
  return useQuery({
    queryKey: MARKET_REGIME_QUERY_KEYS.current(),
    queryFn: () => marketRegimeClient.getMarketRegime(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
