import { useQuery } from "@tanstack/react-query";
import { RsRatingClient } from "../api/rs-rating.client";
import { RS_RATING_QUERY_KEYS } from "../constants";

const rsRatingClient = new RsRatingClient();

export function useRsRatings(symbols: string[]) {
  return useQuery({
     
    queryKey: RS_RATING_QUERY_KEYS.list({ symbols }),
    queryFn: () => rsRatingClient.getRsRatings(symbols),
    enabled: symbols.length > 0,
  });
}
