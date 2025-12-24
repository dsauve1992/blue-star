import { useQuery } from '@tanstack/react-query';
import { TradingViewSearchClient } from '../api/tradingview-search.client';

const tradingViewSearchClient = new TradingViewSearchClient();

export function useTradingViewSearch(query: string) {
  return useQuery({
    queryKey: ['tradingview-search', query],
    queryFn: () => tradingViewSearchClient.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

