export const MARKET_DATA_QUERY_KEYS = {
  all: ["market-data"] as const,
  profiles: () => [...MARKET_DATA_QUERY_KEYS.all, "profile"] as const,
  profile: (symbol: string) =>
    [...MARKET_DATA_QUERY_KEYS.profiles(), symbol] as const,
  charts: () => [...MARKET_DATA_QUERY_KEYS.all, "chart"] as const,
  chart: (
    symbol: string,
    exchange: string,
    interval: string,
    bars: number,
  ) =>
    [
      ...MARKET_DATA_QUERY_KEYS.charts(),
      symbol,
      exchange,
      interval,
      bars,
    ] as const,
} as const;
