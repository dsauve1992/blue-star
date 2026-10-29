import { useQuery } from "@tanstack/react-query";
import { StockClassificationClient } from "../api/stock-classification.client";
import { STOCK_CLASSIFICATION_QUERY_KEYS } from "../constants";

const client = new StockClassificationClient();

export function useStockClassification(symbol: string | null) {
  return useQuery({
    queryKey: STOCK_CLASSIFICATION_QUERY_KEYS.detail(symbol ?? ""),
    queryFn: () => client.getStockClassification(symbol as string),
    enabled: !!symbol,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
