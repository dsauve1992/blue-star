export const STOCK_CLASSIFICATION_QUERY_KEYS = {
  all: ["stock-classification"] as const,
  detail: (symbol: string) =>
    [...STOCK_CLASSIFICATION_QUERY_KEYS.all, symbol] as const,
} as const;
