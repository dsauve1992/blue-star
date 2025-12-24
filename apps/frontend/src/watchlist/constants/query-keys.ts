export const WATCHLIST_QUERY_KEYS = {
  all: ['watchlists'] as const,
  lists: () => [...WATCHLIST_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...WATCHLIST_QUERY_KEYS.lists(), filters] as const,
  details: () => [...WATCHLIST_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...WATCHLIST_QUERY_KEYS.details(), id] as const,
} as const;

