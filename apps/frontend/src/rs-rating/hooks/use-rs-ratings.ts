import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { RsRatingClient } from "../api/rs-rating.client";
import { RS_RATING_QUERY_KEYS } from "../constants";

const rsRatingClient = new RsRatingClient();

export function useRsRatings(symbols: string[]) {
  const normalizedSymbols = [...new Set(symbols)].sort();

  return useQuery({
    queryKey: RS_RATING_QUERY_KEYS.list({ symbols: normalizedSymbols }),
    queryFn: () => rsRatingClient.getRsRatings(normalizedSymbols),
    enabled: normalizedSymbols.length > 0,
    placeholderData: keepPreviousData,
  });
}
