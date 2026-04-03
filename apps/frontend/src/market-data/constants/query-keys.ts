export const MARKET_DATA_QUERY_KEYS = {
  all: ["market-data"] as const,
  profiles: () => [...MARKET_DATA_QUERY_KEYS.all, "profile"] as const,
  profile: (symbol: string) =>
    [...MARKET_DATA_QUERY_KEYS.profiles(), symbol] as const,
} as const;
