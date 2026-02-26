export const MARKET_HEALTH_QUERY_KEYS = {
  all: ['market-health'] as const,
  current: () => [...MARKET_HEALTH_QUERY_KEYS.all, 'current'] as const,
} as const;
