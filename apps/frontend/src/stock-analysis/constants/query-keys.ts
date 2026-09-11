export const MOMENTUM_LEADERS_QUERY_KEYS = {
  all: ["momentum-leaders"] as const,
  latest: () => [...MOMENTUM_LEADERS_QUERY_KEYS.all, "latest"] as const,
} as const;

export const RS_RATING_QUERY_KEYS = {
  all: ["rs-ratings"] as const,
  lists: () => [...RS_RATING_QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...RS_RATING_QUERY_KEYS.lists(), filters] as const,
} as const;

export const INDUSTRY_GROUP_QUERY_KEYS = {
  all: ["industry-groups"] as const,
  lists: () => [...INDUSTRY_GROUP_QUERY_KEYS.all, "list"] as const,
  ratings: (industryGroup: string) =>
    [...INDUSTRY_GROUP_QUERY_KEYS.all, "ratings", industryGroup] as const,
} as const;
