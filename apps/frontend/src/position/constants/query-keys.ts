export const POSITION_QUERY_KEYS = {
  all: ['positions'] as const,
  lists: () => [...POSITION_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...POSITION_QUERY_KEYS.lists(), filters] as const,
  details: () => [...POSITION_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...POSITION_QUERY_KEYS.details(), id] as const,
} as const;
