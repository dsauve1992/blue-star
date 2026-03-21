export const CONSOLIDATION_QUERY_KEYS = {
  all: ["consolidations"] as const,
  lists: () => [...CONSOLIDATION_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...CONSOLIDATION_QUERY_KEYS.lists(), filters] as const,
} as const;

export const RS_RATING_QUERY_KEYS = {
  all: ["rs-ratings"] as const,
  lists: () => [...RS_RATING_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...RS_RATING_QUERY_KEYS.lists(), filters] as const,
} as const;




