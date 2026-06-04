export const MARKET_REGIME_QUERY_KEYS = {
  all: ['market-regime'] as const,
  current: () => [...MARKET_REGIME_QUERY_KEYS.all, 'current'] as const,
} as const;
