export const MARKET_BREADTH_QUERY_KEYS = {
  all: ["market-breadth"] as const,
  list: (limit?: number) =>
    [...MARKET_BREADTH_QUERY_KEYS.all, "list", limit] as const,
} as const;
