import { useQuery } from "@tanstack/react-query";
import { BrokerageClient } from "../api/brokerage.client";
import { BROKERAGE_QUERY_KEYS } from "../constants/query-keys";

const brokerageClient = new BrokerageClient();

export function useBrokerAccounts() {
  return useQuery({
    queryKey: BROKERAGE_QUERY_KEYS.accounts(),
    queryFn: () => brokerageClient.listAccounts(),
    staleTime: 0,
  });
}

export function useTradingJournal(accountId: string | null) {
  return useQuery({
    queryKey: BROKERAGE_QUERY_KEYS.journal(accountId ?? ""),
    queryFn: () => brokerageClient.getTradingJournal(accountId!),
    enabled: !!accountId,
    staleTime: 0,
  });
}
