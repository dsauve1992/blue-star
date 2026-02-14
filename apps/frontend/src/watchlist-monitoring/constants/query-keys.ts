export const WATCHLIST_MONITORING_QUERY_KEYS = {
  all: ['watchlist-monitoring'] as const,
  details: () => [...WATCHLIST_MONITORING_QUERY_KEYS.all, 'detail'] as const,
  detail: (watchlistId: string) =>
    [...WATCHLIST_MONITORING_QUERY_KEYS.details(), watchlistId] as const,
} as const;
