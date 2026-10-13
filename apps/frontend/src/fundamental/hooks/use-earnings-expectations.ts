import { useQuery } from "@tanstack/react-query";
import { FundamentalClient } from "../api/fundamental.client";
import { FUNDAMENTAL_QUERY_KEYS } from "../constants/query-keys";

const fundamentalClient = new FundamentalClient();

export function useEarningsExpectations(symbol: string | null) {
  return useQuery({
    queryKey: FUNDAMENTAL_QUERY_KEYS.earningsExpectations(symbol ?? ""),
    queryFn: () => fundamentalClient.getEarningsExpectations(symbol!),
    enabled: !!symbol,
  });
}
