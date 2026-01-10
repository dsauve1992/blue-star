import { useQuery } from "@tanstack/react-query";
import { FundamentalClient } from "../api/fundamental.client";
import { FUNDAMENTAL_QUERY_KEYS } from "../constants/query-keys";

const fundamentalClient = new FundamentalClient();

export function useFinancialReport(symbol: string | null) {
  return useQuery({
    queryKey: symbol
      ? FUNDAMENTAL_QUERY_KEYS.financialReport(symbol)
      : ["fundamental", "financial-report", "disabled"],
    queryFn: () => fundamentalClient.getFinancialReport(symbol!),
    enabled: !!symbol,
  });
}
