import { useQuery } from '@tanstack/react-query';
import { MarketDataClient } from '../api/market-data.client';
import { POSITION_QUERY_KEYS } from '../constants';

const marketDataClient = new MarketDataClient();

export function useHistoricalData(
  symbol: string,
  startDate: string,
  endDate: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: [...POSITION_QUERY_KEYS.all, 'historical', symbol, startDate, endDate],
    queryFn: () => marketDataClient.getHistoricalData(symbol, startDate, endDate),
    enabled: enabled && !!symbol && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
