export const LEADER_BREADTH_QUERY_KEYS = {
  all: ['leader-breadth'] as const,
  current: () => [...LEADER_BREADTH_QUERY_KEYS.all, 'current'] as const,
} as const;
