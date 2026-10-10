import { useQuery } from "@tanstack/react-query";
import type { ApiError } from "src/global/api/types";
import { FundamentalClient } from "../api/fundamental.client";
import { FUNDAMENTAL_QUERY_KEYS } from "../constants/query-keys";

const fundamentalClient = new FundamentalClient();

export function useAiFinancialRating(symbol: string | null) {
  return useQuery({
    queryKey: FUNDAMENTAL_QUERY_KEYS.aiFinancialRating(symbol ?? ""),
    queryFn: () => fundamentalClient.getAiFinancialRating(symbol!),
    enabled: !!symbol,
    staleTime: Infinity,
    retry: false,
  });
}

export function isNoFinancialDataError(error: unknown): boolean {
  return (error as ApiError | null)?.status === 404;
}
